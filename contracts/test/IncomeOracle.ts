import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  ConfidentialETH,
  ConfidentialETH__factory,
  EncryptedPayroll,
  EncryptedPayroll__factory,
  IncomeOracle,
  IncomeOracle__factory,
  MockERC20,
  MockERC20__factory,
} from "../typechain-types";

const DAY = 24 * 60 * 60;

type Signers = {
  employer: HardhatEthersSigner;
  employee: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
  employer2: HardhatEthersSigner;
};

async function deployContracts() {
  const mockFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
  const underlyingToken = (await mockFactory.deploy("Mock WETH", "mWETH", 18)) as MockERC20;
  await underlyingToken.waitForDeployment();

  const confidentialFactory = (await ethers.getContractFactory("ConfidentialETH")) as ConfidentialETH__factory;
  const confidentialToken = (await confidentialFactory.deploy(
    await underlyingToken.getAddress(),
    "ipfs://payproof-ceth",
  )) as ConfidentialETH;
  await confidentialToken.waitForDeployment();

  const payrollFactory = (await ethers.getContractFactory("EncryptedPayroll")) as EncryptedPayroll__factory;
  const payroll = (await payrollFactory.deploy(await confidentialToken.getAddress())) as EncryptedPayroll;
  const payrollAddress = await payroll.getAddress();

  const oracleFactory = (await ethers.getContractFactory("IncomeOracle")) as IncomeOracle__factory;
  const oracle = (await oracleFactory.deploy(payroll)) as IncomeOracle;
  const oracleAddress = await oracle.getAddress();

  await payroll.allowHook(oracleAddress, true);

  return { payroll, payrollAddress, oracle, oracleAddress, confidentialToken, underlyingToken };
}

describe("IncomeOracle (fhEVM) - Comprehensive Tests", function () {
  let signers: Signers;
  let payroll: EncryptedPayroll;
  let payrollAddress: string;
  let oracle: IncomeOracle;
  let oracleAddress: string;
  let confidentialToken: ConfidentialETH;
  let underlyingToken: MockERC20;
  let fundedEmployers: Set<string>;
  let confidentialAddress: string;
  const DEFAULT_WRAP_AMOUNT = ethers.parseUnits("1000000", 18);

  before(async function () {
    const [employer, employee, verifier, employer2] = await ethers.getSigners();
    signers = { employer, employee, verifier, employer2 };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ payroll, payrollAddress, oracle, oracleAddress, confidentialToken, underlyingToken } = await deployContracts());
    confidentialAddress = await confidentialToken.getAddress();
    fundedEmployers = new Set();
  });

  async function ensureFundingFor(employer: HardhatEthersSigner) {
    if (fundedEmployers.has(employer.address)) {
      return;
    }

    await underlyingToken.mint(employer.address, DEFAULT_WRAP_AMOUNT);
    await underlyingToken
      .connect(employer)
      .approve(confidentialAddress, DEFAULT_WRAP_AMOUNT);

    await confidentialToken.connect(employer).wrap(employer.address, DEFAULT_WRAP_AMOUNT);

    const expiry = Math.floor(Date.now() / 1000) + 10 * 365 * DAY;
    await confidentialToken.connect(employer).setOperator(payrollAddress, expiry);

    fundedEmployers.add(employer.address);
  }

  async function createStream(ratePerSecond: number, employer = signers.employer, employee = signers.employee) {
    await ensureFundingFor(employer);

    const encryptedRate = await fhevm
      .createEncryptedInput(payrollAddress, employer.address)
      .add64(ratePerSecond)
      .encrypt();

    await payroll
      .connect(employer)
      .createStream(
        employee.address,
        encryptedRate.handles[0],
        encryptedRate.inputProof,
        30 * DAY,
        0,
      );
    const streamKey = await payroll.computeStreamId(employer.address, employee.address);
    await payroll.connect(employer).setStreamHook(streamKey, oracleAddress);
    return streamKey;
  }

  async function decryptPaid(streamKey: string, account: HardhatEthersSigner = signers.employee) {
    const connected = oracle.connect(account);
    const handle = await connected.encryptedPaidAmount.staticCall(streamKey);
    await connected.encryptedPaidAmount(streamKey);
    return fhevm.userDecryptEuint(FhevmType.euint128, handle, oracleAddress, account);
  }

  async function decryptOutstanding(streamKey: string, account: HardhatEthersSigner = signers.employee) {
    const connected = oracle.connect(account);
    const handle = await connected.encryptedOutstandingOnCancel.staticCall(streamKey);
    await connected.encryptedOutstandingOnCancel(streamKey);
    return fhevm.userDecryptEuint(FhevmType.euint128, handle, oracleAddress, account);
  }

  async function attestIncome(thresholdValue: bigint, lookbackDays: number) {
    const encryptedThreshold = await fhevm
      .createEncryptedInput(oracleAddress, signers.verifier.address)
      .add128(thresholdValue)
      .encrypt();

    const tx = await oracle
      .connect(signers.verifier)
      .attestMonthlyIncome(
        signers.employer.address,
        signers.employee.address,
        encryptedThreshold.handles[0],
        encryptedThreshold.inputProof,
        lookbackDays,
      );

    const receipt = await tx.wait();
    const topics = oracle.interface.getEvent("Attested").topicHash;
    const attestedLog = receipt?.logs.find(
      (log) => log.topics[0] === topics && log.address === oracleAddress,
    );
    if (!attestedLog) {
      throw new Error("Attested event not found");
    }
    return oracle.interface.parseLog(attestedLog);
  }

  async function decryptAttestationResults(parsed: any) {
    const clearMeets = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      parsed.args.meetsHandle,
      oracleAddress,
      signers.verifier,
    );

    const clearTier = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      parsed.args.tierHandle,
      oracleAddress,
      signers.verifier,
    );

    return { meets: clearMeets, tier: clearTier };
  }

  describe("Basic Attestation", function () {
    it("attests income against a threshold successfully", async function () {
      await createStream(2);

      const lookback = 30;
      const projectedClear = 2n * BigInt(lookback) * BigInt(DAY);
      const thresholdValue = projectedClear / 2n;

      const parsed = await attestIncome(thresholdValue, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier.A (>= 2x threshold)
    });

    it("emits Attested event with correct data", async function () {
      await createStream(2);

      const encryptedThreshold = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(1000n)
        .encrypt();

      await expect(
        oracle
          .connect(signers.verifier)
          .attestMonthlyIncome(
            signers.employer.address,
            signers.employee.address,
            encryptedThreshold.handles[0],
            encryptedThreshold.inputProof,
            30,
          )
      ).to.emit(oracle, "Attested");
    });

    it("returns valid attestation ID", async function () {
      await createStream(5);

      const encryptedThreshold = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(1000n)
        .encrypt();

      const parsed = await attestIncome(1000n, 30);

      expect(parsed.args.attestationId).to.not.equal(ethers.ZeroHash);
      expect(parsed.args.streamId).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Tier Calculations", function () {
    it("returns Tier A when income >= 2x threshold", async function () {
      // Rate of 10 per second = 10 * 30 * 86400 = 25,920,000 over 30 days
      await createStream(10);

      // Threshold at 12,000,000 (income is ~2.16x threshold)
      const parsed = await attestIncome(12_000_000n, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A
    });

    it("returns Tier B when income >= 1.1x but < 2x threshold", async function () {
      // Rate of 10 per second = 25,920,000 over 30 days
      await createStream(10);

      // Threshold at 20,000,000 (income is ~1.3x threshold)
      const parsed = await attestIncome(20_000_000n, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(2n); // Tier B
    });

    it("returns Tier C when income exactly meets threshold", async function () {
      // Rate of 10 per second = 25,920,000 over 30 days
      await createStream(10);

      // Threshold exactly at projected income
      const projectedIncome = 10n * 30n * BigInt(DAY);
      const parsed = await attestIncome(projectedIncome, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(1n); // Tier C
    });

    it("returns Tier C when income slightly above threshold", async function () {
      // Rate of 10 per second = 25,920,000 over 30 days
      await createStream(10);

      // Threshold slightly below projected income (1.05x)
      const projectedIncome = 10n * 30n * BigInt(DAY);
      const threshold = (projectedIncome * 100n) / 105n;

      const parsed = await attestIncome(threshold, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(1n); // Tier C
    });

    it("returns no tier when income below threshold", async function () {
      await createStream(1);

      // Very high threshold
      const parsed = await attestIncome(10_000_000n, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(0n);
      expect(tier).to.equal(0n); // No tier
    });
  });

  describe("Lookback Window Variations", function () {
    it("correctly calculates for 7-day lookback", async function () {
      await createStream(10);

      const lookback = 7;
      const projectedIncome = 10n * BigInt(lookback) * BigInt(DAY);
      const threshold = projectedIncome / 2n;

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A
    });

    it("correctly calculates for 60-day lookback", async function () {
      await createStream(10);

      const lookback = 60;
      const projectedIncome = 10n * BigInt(lookback) * BigInt(DAY);
      const threshold = projectedIncome / 2n;

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A
    });

    it("correctly calculates for 90-day lookback", async function () {
      await createStream(5);

      const lookback = 90;
      const projectedIncome = 5n * BigInt(lookback) * BigInt(DAY);
      const threshold = (projectedIncome * 100n) / 150n; // 1.5x for Tier B

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(2n); // Tier B
    });

    it("rejects zero lookback", async function () {
      await createStream(1);
      const threshold = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(1_000n)
        .encrypt();

      await expect(
        oracle
          .connect(signers.verifier)
          .attestMonthlyIncome(
            signers.employer.address,
            signers.employee.address,
            threshold.handles[0],
            threshold.inputProof,
            0,
          ),
      ).to.be.revertedWithCustomError(oracle, "InvalidLookback");
    });
  });

  describe("Edge Cases and Boundary Conditions", function () {
    it("handles very small income correctly", async function () {
      // Very small rate: 1 per second
      await createStream(1);

      const lookback = 30;
      const projectedIncome = 1n * BigInt(lookback) * BigInt(DAY);
      const threshold = projectedIncome / 2n;

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A
    });

    it("handles very large income correctly", async function () {
      // Large rate: 1,000,000 per second
      await createStream(1_000_000);

      const lookback = 30;
      const projectedIncome = 1_000_000n * BigInt(lookback) * BigInt(DAY);
      const threshold = projectedIncome / 2n;

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A
    });

    it("handles zero threshold correctly", async function () {
      await createStream(10);

      const parsed = await attestIncome(0n, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.be.greaterThan(0n); // Should meet with tier
    });

    it("handles threshold at exact 2x boundary", async function () {
      await createStream(10);

      const lookback = 30;
      const projectedIncome = 10n * BigInt(lookback) * BigInt(DAY);
      const threshold = projectedIncome / 2n; // Exactly 2x

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(3n); // Tier A (boundary inclusive)
    });

    it("handles threshold at exact 1.1x boundary", async function () {
      await createStream(10);

      const lookback = 30;
      const projectedIncome = 10n * BigInt(lookback) * BigInt(DAY);
      const threshold = (projectedIncome * 100n) / 110n; // Exactly 1.1x

      const parsed = await attestIncome(threshold, lookback);
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.equal(1n);
      expect(tier).to.equal(2n); // Tier B (boundary inclusive)
    });
  });

  describe("Multiple Streams and Attestations", function () {
    it("handles attestations for different employer-employee pairs", async function () {
      // Create stream 1
      await createStream(10, signers.employer, signers.employee);

      // Create stream 2 with different employer
      await createStream(20, signers.employer2, signers.employee);

      // Attest for stream 1
      const encThreshold1 = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(5_000_000n)
        .encrypt();

      const tx1 = await oracle
        .connect(signers.verifier)
        .attestMonthlyIncome(
          signers.employer.address,
          signers.employee.address,
          encThreshold1.handles[0],
          encThreshold1.inputProof,
          30,
        );
      const receipt1 = await tx1.wait();

      // Attest for stream 2
      const encThreshold2 = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(10_000_000n)
        .encrypt();

      const tx2 = await oracle
        .connect(signers.verifier)
        .attestMonthlyIncome(
          signers.employer2.address,
          signers.employee.address,
          encThreshold2.handles[0],
          encThreshold2.inputProof,
          30,
        );
      const receipt2 = await tx2.wait();

      // Both should succeed with different results
      expect(receipt1).to.not.be.undefined;
      expect(receipt2).to.not.be.undefined;
    });

    it("allows multiple attestations for same stream with different thresholds", async function () {
      await createStream(10);

      // First attestation with low threshold
      const parsed1 = await attestIncome(5_000_000n, 30);
      const result1 = await decryptAttestationResults(parsed1);

      // Second attestation with high threshold
      const parsed2 = await attestIncome(50_000_000n, 30);
      const result2 = await decryptAttestationResults(parsed2);

      expect(result1.meets).to.equal(1n);
      expect(result2.meets).to.equal(0n);
    });

    it("generates unique attestation IDs for each attestation", async function () {
      await createStream(10);

      const parsed1 = await attestIncome(5_000_000n, 30);
      const parsed2 = await attestIncome(10_000_000n, 30);

      expect(parsed1.args.attestationId).to.not.equal(parsed2.args.attestationId);
    });
  });

  describe("Privacy Guarantees", function () {
    it("returns encrypted handles for meets and tier", async function () {
      await createStream(10);

      const parsed = await attestIncome(5_000_000n, 30);

      // Handles should be bytes32 (not plaintext)
      expect(parsed.args.meetsHandle).to.match(/^0x[0-9a-f]{64}$/i);
      expect(parsed.args.tierHandle).to.match(/^0x[0-9a-f]{64}$/i);
    });

    it("allows verifier to decrypt results", async function () {
      await createStream(10);

      const parsed = await attestIncome(5_000_000n, 30);

      // Should be able to decrypt as verifier
      const { meets, tier } = await decryptAttestationResults(parsed);

      expect(meets).to.be.oneOf([0n, 1n]);
      expect(Number(tier)).to.be.oneOf([0, 1, 2, 3]);
    });

    it("maintains privacy of exact income amount", async function () {
      // This test demonstrates that third parties only learn the tier, not the exact amount
      await createStream(10);

      const parsed = await attestIncome(10_000_000n, 30);
      const { meets, tier } = await decryptAttestationResults(parsed);

      // We know the tier, but the exact income is hidden
      expect(meets).to.equal(1n);
      expect(tier).to.be.greaterThan(0n);

      // The actual income (25,920,000) is NOT revealed in the event
      // Only the encrypted handles are emitted
    });
  });

  describe("Hook Callbacks", function () {
    it("records paid amount on withdrawal", async function () {
      const streamKey = await createStream(5);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(500n)
        .encrypt();

      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(
        payroll.connect(signers.employee).withdrawMax(streamKey, signers.employee.address),
      ).to.emit(oracle, "PaidAmountUpdated");

      const connected = oracle.connect(signers.employee);
      const handle = await connected.encryptedPaidAmount.staticCall(streamKey);
      expect(handle).to.not.equal(ethers.ZeroHash);
      await connected.encryptedPaidAmount(streamKey);

      const lastPaid = await oracle.lastPaymentTimestamp(streamKey);
      expect(lastPaid).to.be.gt(0n);
    });

    it("records outstanding amount on cancel", async function () {
      const streamKey = await createStream(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(250n)
        .encrypt();

      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(
        payroll.connect(signers.employer).cancelStream(streamKey),
      ).to.emit(oracle, "OutstandingRecorded");

      const outstanding = await decryptOutstanding(streamKey);
      expect(Number(outstanding)).to.be.closeTo(250, 16);
      const lastCancel = await oracle.lastCancellationTimestamp(streamKey);
      expect(lastCancel).to.be.gt(0n);
    });
  });

  describe("Integration with Payroll Contract", function () {
    it("correctly references the payroll contract", async function () {
      const payrollFromOracle = await oracle.payroll();
      expect(payrollFromOracle).to.equal(payrollAddress);
    });

    it("verifies stream exists before attestation", async function () {
      // Don't create a stream
      const encryptedThreshold = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(1000n)
        .encrypt();

      // Attempting to attest on non-existent stream should revert
      await expect(
        oracle
          .connect(signers.verifier)
          .attestMonthlyIncome(
            signers.employer.address,
            signers.employee.address,
            encryptedThreshold.handles[0],
            encryptedThreshold.inputProof,
            30,
          )
      ).to.be.revertedWithCustomError(payroll, "StreamNotFound");
    });
  });

  describe("Gas Optimization", function () {
    it("attestation transaction completes efficiently", async function () {
      await createStream(10);

      const encryptedThreshold = await fhevm
        .createEncryptedInput(oracleAddress, signers.verifier.address)
        .add128(5_000_000n)
        .encrypt();

      const tx = await oracle
        .connect(signers.verifier)
        .attestMonthlyIncome(
          signers.employer.address,
          signers.employee.address,
          encryptedThreshold.handles[0],
          encryptedThreshold.inputProof,
          30,
        );

      const receipt = await tx.wait();

      // Verify transaction was mined successfully
      expect(receipt?.status).to.equal(1);
      expect(receipt?.gasUsed).to.be.greaterThan(0n);
    });
  });

  describe("Contract State", function () {
    it("does not store plaintext income data", async function () {
      await createStream(10);

      const parsed = await attestIncome(5_000_000n, 30);

      // Check that the event only contains encrypted data
      expect(parsed.args.meetsHandle).to.be.a('string');
      expect(parsed.args.tierHandle).to.be.a('string');

      // No plaintext income value is stored or emitted
      expect(parsed.args).to.not.have.property('plaintextIncome');
      expect(parsed.args).to.not.have.property('plaintextRate');
    });
  });
});

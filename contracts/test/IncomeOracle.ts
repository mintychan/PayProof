import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  EncryptedPayroll,
  EncryptedPayroll__factory,
  IncomeOracle,
  IncomeOracle__factory,
} from "../typechain-types";

const DAY = 24 * 60 * 60;

type Signers = {
  employer: HardhatEthersSigner;
  employee: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
};

async function deployContracts() {
  const payrollFactory = (await ethers.getContractFactory("EncryptedPayroll")) as EncryptedPayroll__factory;
  const payroll = (await payrollFactory.deploy()) as EncryptedPayroll;
  const payrollAddress = await payroll.getAddress();

  const oracleFactory = (await ethers.getContractFactory("IncomeOracle")) as IncomeOracle__factory;
  const oracle = (await oracleFactory.deploy(payroll)) as IncomeOracle;

  return { payroll, payrollAddress, oracle };
}

describe("IncomeOracle (fhEVM)", function () {
  let signers: Signers;
  let payroll: EncryptedPayroll;
  let payrollAddress: string;
  let oracle: IncomeOracle;

  before(async function () {
    const [employer, employee, verifier] = await ethers.getSigners();
    signers = { employer, employee, verifier };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ payroll, payrollAddress, oracle } = await deployContracts());
  });

  async function createStream(ratePerSecond: number) {
    const encryptedRate = await fhevm
      .createEncryptedInput(payrollAddress, signers.employer.address)
      .add64(ratePerSecond)
      .encrypt();

    await payroll
      .connect(signers.employer)
      .createStream(
        signers.employee.address,
        encryptedRate.handles[0],
        encryptedRate.inputProof,
        30 * DAY,
        0,
      );

    return payroll.computeStreamId(signers.employer.address, signers.employee.address);
  }

  it("attests income against a threshold", async function () {
    await createStream(2);
    const streamId = await payroll.computeStreamId(signers.employer.address, signers.employee.address);

    const lookback = 30;
    const projectedClear = 2n * BigInt(lookback) * BigInt(DAY);
    const thresholdValue = projectedClear / 2n;
    const oracleAddress = await oracle.getAddress();
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
        lookback,
      );
    const receipt = await tx.wait();
    const topics = oracle.interface.getEvent("Attested").topicHash;
    const attestedLog = receipt?.logs.find(
      (log) => log.topics[0] === topics && log.address === oracleAddress,
    );
    if (!attestedLog) {
      throw new Error("Attested event not found");
    }
    const parsed = oracle.interface.parseLog(attestedLog);

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

    expect(clearMeets).to.equal(1n);
    expect(clearTier).to.equal(3n); // Tier.A
  });

  it("fails threshold when projected income is insufficient", async function () {
    await createStream(1);

    const oracleAddress = await oracle.getAddress();
    const threshold = await fhevm
      .createEncryptedInput(oracleAddress, signers.verifier.address)
      .add128(10_000_000n)
      .encrypt();

    const tx = await oracle
      .connect(signers.verifier)
      .attestMonthlyIncome(
        signers.employer.address,
        signers.employee.address,
        threshold.handles[0],
        threshold.inputProof,
        30,
      );
    const receipt = await tx.wait();
    const attestedTopic = oracle.interface.getEvent("Attested").topicHash;
    const attestedLog = receipt?.logs.find(
      (log) => log.topics[0] === attestedTopic && log.address === oracleAddress,
    );
    if (!attestedLog) {
      throw new Error("Attested event not found");
    }
    const parsed = oracle.interface.parseLog(attestedLog);

    const meets = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      parsed.args.meetsHandle,
      oracleAddress,
      signers.verifier,
    );
    const tier = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      parsed.args.tierHandle,
      oracleAddress,
      signers.verifier,
    );

    expect(meets).to.equal(0n);
    expect(tier).to.equal(0n);
  });

  it("rejects zero lookback", async function () {
    await createStream(1);
    const oracleAddress = await oracle.getAddress();
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

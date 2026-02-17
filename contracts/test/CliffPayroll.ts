import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  CliffPayroll,
  CliffPayroll__factory,
  ConfidentialETH,
  ConfidentialETH__factory,
  EncryptedPayroll,
  EncryptedPayroll__factory,
  MockERC20,
  MockERC20__factory,
} from "../typechain-types";

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;

async function deploySystem(): Promise<{
  payroll: EncryptedPayroll;
  payrollAddress: string;
  cliffPayroll: CliffPayroll;
  cliffPayrollAddress: string;
  confidentialToken: ConfidentialETH;
  underlyingToken: MockERC20;
}> {
  const mockERC20Factory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
  const underlyingToken = (await mockERC20Factory.deploy("Mock WETH", "mWETH", 18)) as MockERC20;
  await underlyingToken.waitForDeployment();

  const confidentialFactory = (await ethers.getContractFactory("ConfidentialETH")) as ConfidentialETH__factory;
  const confidentialToken = (await confidentialFactory.deploy(
    await underlyingToken.getAddress(),
    "ipfs://payproof-ceth",
  )) as ConfidentialETH;
  await confidentialToken.waitForDeployment();

  const payrollFactory = (await ethers.getContractFactory("EncryptedPayroll")) as EncryptedPayroll__factory;
  const payroll = (await payrollFactory.deploy(await confidentialToken.getAddress())) as EncryptedPayroll;
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();

  const cliffFactory = (await ethers.getContractFactory("CliffPayroll")) as CliffPayroll__factory;
  const cliffPayroll = (await cliffFactory.deploy(payrollAddress)) as CliffPayroll;
  await cliffPayroll.waitForDeployment();
  const cliffPayrollAddress = await cliffPayroll.getAddress();

  return { payroll, payrollAddress, cliffPayroll, cliffPayrollAddress, confidentialToken, underlyingToken };
}

describe("CliffPayroll (fhEVM)", function () {
  let payroll: EncryptedPayroll;
  let payrollAddress: string;
  let cliffPayroll: CliffPayroll;
  let confidentialToken: ConfidentialETH;
  let underlyingToken: MockERC20;

  let employer: HardhatEthersSigner;
  let employee: HardhatEthersSigner;
  let thirdParty: HardhatEthersSigner;

  const DEFAULT_WRAP_AMOUNT = ethers.parseUnits("1000000", 18);

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    [, employer, employee, thirdParty] = await ethers.getSigners();
    ({ payroll, payrollAddress, cliffPayroll, confidentialToken, underlyingToken } = await deploySystem());
  });

  async function ensureFundingFor(signer: HardhatEthersSigner) {
    const confidentialAddress = await confidentialToken.getAddress();

    await underlyingToken.mint(signer.address, DEFAULT_WRAP_AMOUNT);
    await underlyingToken.connect(signer).approve(confidentialAddress, DEFAULT_WRAP_AMOUNT);
    await confidentialToken.connect(signer).wrap(signer.address, DEFAULT_WRAP_AMOUNT);

    const expiry = Math.floor(Date.now() / 1000) + 10 * 365 * DAY;
    await confidentialToken.connect(signer).setOperator(payrollAddress, expiry);
  }

  async function createStreamWithRate(
    ratePerSecond: number,
    cadence = 30 * DAY,
    emp = employer,
    emplee = employee,
  ) {
    await ensureFundingFor(emp);

    const encryptedRate = await fhevm
      .createEncryptedInput(payrollAddress, emp.address)
      .add64(ratePerSecond)
      .encrypt();

    const tx = await payroll
      .connect(emp)
      .createStream(emplee.address, encryptedRate.handles[0], encryptedRate.inputProof, cadence, 0);
    await tx.wait();

    const streamKey = await payroll.computeStreamId(emp.address, emplee.address);
    return { streamKey };
  }

  describe("Deployment", function () {
    it("stores the correct payroll reference", async function () {
      expect(await cliffPayroll.payroll()).to.equal(payrollAddress);
    });
  });

  describe("registerCliff", function () {
    it("allows employer to register a cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const cliffDuration = 90 * DAY; // 90-day cliff

      await expect(cliffPayroll.connect(employer).registerCliff(streamKey, cliffDuration))
        .to.emit(cliffPayroll, "CliffRegistered")
        .withArgs(streamKey, (value: bigint) => {
          // cliffEnd should be approximately block.timestamp + cliffDuration
          return value > 0n;
        });

      expect(await cliffPayroll.hasCliff(streamKey)).to.equal(true);
      const cliffEnd = await cliffPayroll.getCliffEnd(streamKey);
      expect(cliffEnd).to.be.greaterThan(0n);
    });

    it("reverts when non-employer tries to register cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await expect(
        cliffPayroll.connect(thirdParty).registerCliff(streamKey, 90 * DAY),
      ).to.be.revertedWithCustomError(cliffPayroll, "NotStreamEmployer");
    });

    it("reverts when employee tries to register cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await expect(
        cliffPayroll.connect(employee).registerCliff(streamKey, 90 * DAY),
      ).to.be.revertedWithCustomError(cliffPayroll, "NotStreamEmployer");
    });

    it("reverts when cliff is registered twice", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await cliffPayroll.connect(employer).registerCliff(streamKey, 90 * DAY);

      await expect(
        cliffPayroll.connect(employer).registerCliff(streamKey, 30 * DAY),
      ).to.be.revertedWithCustomError(cliffPayroll, "CliffAlreadyRegistered");
    });

    it("reverts when cliff duration is zero", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await expect(
        cliffPayroll.connect(employer).registerCliff(streamKey, 0),
      ).to.be.revertedWithCustomError(cliffPayroll, "InvalidCliffDuration");
    });

    it("reverts for non-existent stream", async function () {
      const fakeStreamKey = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));

      await expect(
        cliffPayroll.connect(employer).registerCliff(fakeStreamKey, 90 * DAY),
      ).to.be.revertedWithCustomError(payroll, "StreamNotFound");
    });
  });

  describe("isCliffReached", function () {
    it("returns false before cliff period ends", async function () {
      const { streamKey } = await createStreamWithRate(5);
      await cliffPayroll.connect(employer).registerCliff(streamKey, 90 * DAY);

      expect(await cliffPayroll.isCliffReached(streamKey)).to.equal(false);
    });

    it("returns true after cliff period ends", async function () {
      const { streamKey } = await createStreamWithRate(5);
      await cliffPayroll.connect(employer).registerCliff(streamKey, HOUR);

      // Advance time past the cliff
      await ethers.provider.send("evm_increaseTime", [HOUR + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await cliffPayroll.isCliffReached(streamKey)).to.equal(true);
    });

    it("returns true when no cliff is configured", async function () {
      const { streamKey } = await createStreamWithRate(5);

      // No cliff registered - should always be withdrawable
      expect(await cliffPayroll.isCliffReached(streamKey)).to.equal(true);
    });

    it("returns true exactly at cliff end timestamp", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const cliffDuration = 1000;
      await cliffPayroll.connect(employer).registerCliff(streamKey, cliffDuration);

      // Advance to exactly the cliff duration
      await ethers.provider.send("evm_increaseTime", [cliffDuration]);
      await ethers.provider.send("evm_mine", []);

      expect(await cliffPayroll.isCliffReached(streamKey)).to.equal(true);
    });
  });

  describe("View functions", function () {
    it("getCliffEnd returns 0 for streams without cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);
      expect(await cliffPayroll.getCliffEnd(streamKey)).to.equal(0n);
    });

    it("getCliffEnd returns correct timestamp after registration", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const cliffDuration = 90 * DAY;

      await cliffPayroll.connect(employer).registerCliff(streamKey, cliffDuration);

      const cliffEnd = await cliffPayroll.getCliffEnd(streamKey);
      expect(cliffEnd).to.be.greaterThan(0n);
    });

    it("hasCliff returns false for streams without cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);
      expect(await cliffPayroll.hasCliff(streamKey)).to.equal(false);
    });

    it("hasCliff returns true after registration", async function () {
      const { streamKey } = await createStreamWithRate(5);
      await cliffPayroll.connect(employer).registerCliff(streamKey, 30 * DAY);
      expect(await cliffPayroll.hasCliff(streamKey)).to.equal(true);
    });

    it("remainingCliffTime returns correct seconds before cliff", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const cliffDuration = 1000;
      await cliffPayroll.connect(employer).registerCliff(streamKey, cliffDuration);

      const remaining = await cliffPayroll.remainingCliffTime(streamKey);
      // remaining should be close to cliffDuration (within a few seconds of block mining)
      expect(Number(remaining)).to.be.closeTo(cliffDuration, 10);
    });

    it("remainingCliffTime returns 0 after cliff passes", async function () {
      const { streamKey } = await createStreamWithRate(5);
      await cliffPayroll.connect(employer).registerCliff(streamKey, HOUR);

      await ethers.provider.send("evm_increaseTime", [HOUR + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await cliffPayroll.remainingCliffTime(streamKey)).to.equal(0n);
    });

    it("remainingCliffTime returns 0 when no cliff configured", async function () {
      const { streamKey } = await createStreamWithRate(5);
      expect(await cliffPayroll.remainingCliffTime(streamKey)).to.equal(0n);
    });
  });

  describe("Multiple streams with different cliffs", function () {
    it("tracks independent cliff configs per stream", async function () {
      // Create two streams to different employees
      const { streamKey: streamKey1 } = await createStreamWithRate(5, 30 * DAY, employer, employee);
      const { streamKey: streamKey2 } = await createStreamWithRate(10, 30 * DAY, employer, thirdParty);

      // Register different cliffs
      await cliffPayroll.connect(employer).registerCliff(streamKey1, 30 * DAY);
      await cliffPayroll.connect(employer).registerCliff(streamKey2, 90 * DAY);

      const cliff1 = await cliffPayroll.getCliffEnd(streamKey1);
      const cliff2 = await cliffPayroll.getCliffEnd(streamKey2);

      // The second cliff should end later than the first
      expect(cliff2).to.be.greaterThan(cliff1);

      // Both should have active cliffs
      expect(await cliffPayroll.hasCliff(streamKey1)).to.equal(true);
      expect(await cliffPayroll.hasCliff(streamKey2)).to.equal(true);
    });
  });
});

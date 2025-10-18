import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedPayroll, EncryptedPayroll__factory } from "../typechain-types";

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;

type Signers = {
  employer: HardhatEthersSigner;
  employee: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
  thirdParty: HardhatEthersSigner;
};

async function deployFixture(): Promise<{ payroll: EncryptedPayroll; payrollAddress: string }> {
  const factory = (await ethers.getContractFactory("EncryptedPayroll")) as EncryptedPayroll__factory;
  const payroll = (await factory.deploy()) as EncryptedPayroll;
  const payrollAddress = await payroll.getAddress();
  return { payroll, payrollAddress };
}

describe("EncryptedPayroll (fhEVM) - Comprehensive Tests", function () {
  let signers: Signers;
  let payroll: EncryptedPayroll;
  let payrollAddress: string;

  async function decryptBalance(streamId: string, account: HardhatEthersSigner) {
    const handle = await payroll.connect(account).encryptedBalanceOf.staticCall(streamId);
    await payroll.connect(account).encryptedBalanceOf(streamId);
    return fhevm.userDecryptEuint(FhevmType.euint128, handle, payrollAddress, account);
  }

  async function decryptRate(streamId: string, account: HardhatEthersSigner) {
    const stream = await payroll.getStream(streamId);
    return fhevm.userDecryptEuint(FhevmType.euint64, stream.rateHandle, payrollAddress, account);
  }

  before(async function () {
    const [employer, employee, verifier, thirdParty] = await ethers.getSigners();
    signers = { employer, employee, verifier, thirdParty };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    ({ payroll, payrollAddress } = await deployFixture());
  });

  async function createStreamWithRate(ratePerSecond: number, cadence = 30 * DAY, employer = signers.employer, employee = signers.employee) {
    const encryptedRate = await fhevm
      .createEncryptedInput(payrollAddress, employer.address)
      .add64(ratePerSecond)
      .encrypt();

    const tx = await payroll
      .connect(employer)
      .createStream(
        employee.address,
        encryptedRate.handles[0],
        encryptedRate.inputProof,
        cadence,
        0,
      );
    await tx.wait();

    return payroll.computeStreamId(employer.address, employee.address);
  }

  describe("Stream Creation", function () {
    it("creates a stream with encrypted rate", async function () {
      const streamId = await createStreamWithRate(5);
      const stream = await payroll.getStream(streamId);

      expect(stream.employer).to.equal(signers.employer.address);
      expect(stream.employee).to.equal(signers.employee.address);
      expect(stream.status).to.equal(1); // Active
      expect(Number(stream.cadenceInSeconds)).to.equal(30 * DAY);
    });

    it("creates stream with custom cadence", async function () {
      const streamId = await createStreamWithRate(10, 7 * DAY);
      const stream = await payroll.getStream(streamId);
      expect(Number(stream.cadenceInSeconds)).to.equal(7 * DAY);
    });

    it("creates stream with delayed start time", async function () {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const encryptedRate = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add64(5)
        .encrypt();

      await payroll
        .connect(signers.employer)
        .createStream(
          signers.employee.address,
          encryptedRate.handles[0],
          encryptedRate.inputProof,
          30 * DAY,
          futureTime,
        );

      const streamId = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const stream = await payroll.getStream(streamId);
      expect(Number(stream.startTime)).to.equal(futureTime);
    });

    it("emits StreamCreated event with correct data", async function () {
      const encryptedRate = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add64(5)
        .encrypt();

      await expect(
        payroll
          .connect(signers.employer)
          .createStream(
            signers.employee.address,
            encryptedRate.handles[0],
            encryptedRate.inputProof,
            30 * DAY,
            0,
          )
      ).to.emit(payroll, "StreamCreated");
    });

    it("rejects duplicate streams", async function () {
      await createStreamWithRate(1);
      const encryptedRate = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add64(1)
        .encrypt();

      await expect(
        payroll
          .connect(signers.employer)
          .createStream(
            signers.employee.address,
            encryptedRate.handles[0],
            encryptedRate.inputProof,
            7 * DAY,
            0,
          ),
      ).to.be.revertedWithCustomError(payroll, "StreamAlreadyExists");
    });

    it("allows same employer to create streams to different employees", async function () {
      await createStreamWithRate(5, 30 * DAY, signers.employer, signers.employee);
      await createStreamWithRate(10, 30 * DAY, signers.employer, signers.verifier);

      const streamId1 = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const streamId2 = await payroll.computeStreamId(signers.employer.address, signers.verifier.address);

      const stream1 = await payroll.getStream(streamId1);
      const stream2 = await payroll.getStream(streamId2);

      expect(stream1.employee).to.equal(signers.employee.address);
      expect(stream2.employee).to.equal(signers.verifier.address);
    });

    it("allows same employee to receive from different employers", async function () {
      await createStreamWithRate(5, 30 * DAY, signers.employer, signers.employee);
      await createStreamWithRate(10, 30 * DAY, signers.verifier, signers.employee);

      const streamId1 = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const streamId2 = await payroll.computeStreamId(signers.verifier.address, signers.employee.address);

      const stream1 = await payroll.getStream(streamId1);
      const stream2 = await payroll.getStream(streamId2);

      expect(stream1.employer).to.equal(signers.employer.address);
      expect(stream2.employer).to.equal(signers.verifier.address);
    });
  });

  describe("Balance Accrual", function () {
    it("accrues encrypted balances over time", async function () {
      const streamId = await createStreamWithRate(5);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamId);

      const clearBalance = await decryptBalance(streamId, signers.employee);
      expect(Number(clearBalance)).to.be.closeTo(Number(5n * 3600n), 16);
    });

    it("accrues correctly over multiple sync calls", async function () {
      const streamId = await createStreamWithRate(10);

      // First accrual
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);
      const balance1 = await decryptBalance(streamId, signers.employee);

      // Second accrual
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);
      const balance2 = await decryptBalance(streamId, signers.employee);

      expect(Number(balance1)).to.be.closeTo(10000, 100);
      expect(Number(balance2)).to.be.closeTo(20000, 100);
    });

    it("accrues from current time when startTime is 0", async function () {
      const streamId = await createStreamWithRate(10);

      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamId);
      const balance = await decryptBalance(streamId, signers.employee);

      // Should accrue approximately 10 * 1000 = 10000
      expect(Number(balance)).to.be.closeTo(10000, 200);
    });
  });

  describe("Top Up", function () {
    it("tops up stream balance", async function () {
      const streamId = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();
      await payroll
        .connect(signers.employer)
        .topUp(streamId, topUp.handles[0], topUp.inputProof);

      const clearAfterTopUp = await decryptBalance(streamId, signers.employee);
      expect(Number(clearAfterTopUp)).to.be.closeTo(1000, 16);
    });

    it("emits StreamToppedUp event", async function () {
      const streamId = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();

      await expect(
        payroll.connect(signers.employer).topUp(streamId, topUp.handles[0], topUp.inputProof)
      ).to.emit(payroll, "StreamToppedUp");
    });

    it("allows multiple top ups", async function () {
      const streamId = await createStreamWithRate(3);

      const topUp1 = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(500n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamId, topUp1.handles[0], topUp1.inputProof);

      const topUp2 = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(300n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamId, topUp2.handles[0], topUp2.inputProof);

      const balance = await decryptBalance(streamId, signers.employee);
      expect(Number(balance)).to.be.closeTo(800, 16);
    });

    it("rejects non-employer top up", async function () {
      const streamId = await createStreamWithRate(1);

      const amount = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(100)
        .encrypt();

      await expect(
        payroll.connect(signers.verifier).topUp(streamId, amount.handles[0], amount.inputProof),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });
  });

  describe("Pause and Resume", function () {
    it("pauses and resumes stream accrual", async function () {
      const streamId = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamId, topUp.handles[0], topUp.inputProof);

      const clearAfterTopUp = await decryptBalance(streamId, signers.employee);
      expect(Number(clearAfterTopUp)).to.be.closeTo(1000, 16);

      await payroll.connect(signers.employer).pauseStream(streamId);
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      const clearPaused = await decryptBalance(streamId, signers.employee);
      expect(Number(clearPaused)).to.be.closeTo(1000, 16);

      await payroll.connect(signers.employer).resumeStream(streamId);
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);

      const clearResumed = await decryptBalance(streamId, signers.employee);
      expect(Number(clearResumed)).to.be.greaterThan(1000);
    });

    it("emits StreamPaused event", async function () {
      const streamId = await createStreamWithRate(3);
      await expect(payroll.connect(signers.employer).pauseStream(streamId))
        .to.emit(payroll, "StreamPaused");
    });

    it("emits StreamResumed event", async function () {
      const streamId = await createStreamWithRate(3);
      await payroll.connect(signers.employer).pauseStream(streamId);
      await expect(payroll.connect(signers.employer).resumeStream(streamId))
        .to.emit(payroll, "StreamResumed");
    });

    it("maintains paused status correctly", async function () {
      const streamId = await createStreamWithRate(3);
      await payroll.connect(signers.employer).pauseStream(streamId);

      const stream = await payroll.getStream(streamId);
      expect(stream.status).to.equal(2); // Paused
    });

    it("maintains active status before pause", async function () {
      const streamId = await createStreamWithRate(3);

      const stream = await payroll.getStream(streamId);
      expect(stream.status).to.equal(1); // Active
    });

    it("rejects non-employer pause", async function () {
      const streamId = await createStreamWithRate(1);

      await expect(
        payroll.connect(signers.verifier).pauseStream(streamId),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });

    it("rejects non-employer resume", async function () {
      const streamId = await createStreamWithRate(1);
      await payroll.connect(signers.employer).pauseStream(streamId);

      await expect(
        payroll.connect(signers.verifier).resumeStream(streamId),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });
  });

  describe("Balance Tracking", function () {
    it("tracks accrued balance for employee", async function () {
      const streamId = await createStreamWithRate(10);

      // Accrue some balance
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);

      const balance = await decryptBalance(streamId, signers.employee);
      expect(Number(balance)).to.be.greaterThan(0);
      expect(Number(balance)).to.be.closeTo(10000, 200);
    });

    it("allows both employer and employee to view balance", async function () {
      const streamId = await createStreamWithRate(10);

      await ethers.provider.send("evm_increaseTime", [500]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);

      const employeeBalance = await decryptBalance(streamId, signers.employee);
      const employerBalance = await decryptBalance(streamId, signers.employer);

      expect(Number(employeeBalance)).to.equal(Number(employerBalance));
      expect(Number(employeeBalance)).to.be.closeTo(5000, 200);
    });
  });

  describe("Cancel Stream", function () {
    it("allows employer to cancel stream", async function () {
      const streamId = await createStreamWithRate(5);

      await payroll.connect(signers.employer).cancelStream(streamId);

      const stream = await payroll.getStream(streamId);
      expect(stream.status).to.equal(3); // Cancelled
    });

    it("emits StreamCancelled event", async function () {
      const streamId = await createStreamWithRate(5);

      await expect(payroll.connect(signers.employer).cancelStream(streamId))
        .to.emit(payroll, "StreamCancelled");
    });

    it("rejects non-employer cancellation", async function () {
      const streamId = await createStreamWithRate(5);

      await expect(
        payroll.connect(signers.thirdParty).cancelStream(streamId)
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });

    it("sets status to cancelled", async function () {
      const streamId = await createStreamWithRate(5);
      await payroll.connect(signers.employer).cancelStream(streamId);

      const stream = await payroll.getStream(streamId);
      expect(stream.status).to.equal(3); // Cancelled
    });
  });

  describe("Stream Queries", function () {
    it("computes consistent stream IDs", async function () {
      const streamId1 = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const streamId2 = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      expect(streamId1).to.equal(streamId2);
    });

    it("computes different stream IDs for different pairs", async function () {
      const streamId1 = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const streamId2 = await payroll.computeStreamId(signers.employer.address, signers.verifier.address);
      expect(streamId1).to.not.equal(streamId2);
    });

    it("returns correct stream data", async function () {
      const streamId = await createStreamWithRate(7, 14 * DAY);
      const stream = await payroll.getStream(streamId);

      expect(stream.employer).to.equal(signers.employer.address);
      expect(stream.employee).to.equal(signers.employee.address);
      expect(stream.status).to.equal(1); // Active
      expect(Number(stream.cadenceInSeconds)).to.equal(14 * DAY);
    });

    it("allows employer to view encrypted rate", async function () {
      const streamId = await createStreamWithRate(12);
      const rate = await decryptRate(streamId, signers.employer);
      expect(Number(rate)).to.equal(12);
    });

    it("allows employee to view encrypted rate", async function () {
      const streamId = await createStreamWithRate(15);
      const rate = await decryptRate(streamId, signers.employee);
      expect(Number(rate)).to.equal(15);
    });
  });

  describe("Edge Cases", function () {
    it("handles very small rates", async function () {
      const streamId = await createStreamWithRate(1);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);

      const balance = await decryptBalance(streamId, signers.employee);
      expect(Number(balance)).to.be.closeTo(100, 10);
    });

    it("handles very large rates", async function () {
      const largeRate = 1000000;
      const streamId = await createStreamWithRate(largeRate);

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamId);

      const balance = await decryptBalance(streamId, signers.employee);
      // Balance should be in the ballpark of largeRate * 10
      // Allow for timing overhead in test environment
      expect(Number(balance)).to.be.greaterThan(largeRate * 5);
      expect(Number(balance)).to.be.lessThan(largeRate * 20);
    });

    it("handles zero initial balance", async function () {
      const streamId = await createStreamWithRate(5);
      const balance = await decryptBalance(streamId, signers.employee);
      expect(Number(balance)).to.equal(0);
    });

    it("maintains separate balances for multiple streams", async function () {
      // Employee receives from two different employers
      const streamId1 = await createStreamWithRate(10, 30 * DAY, signers.employer, signers.employee);
      const streamId2 = await createStreamWithRate(20, 30 * DAY, signers.verifier, signers.employee);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamId1);
      await payroll.connect(signers.verifier).syncStream(streamId2);

      const balance1 = await decryptBalance(streamId1, signers.employee);
      const balance2 = await decryptBalance(streamId2, signers.employee);

      expect(Number(balance1)).to.be.closeTo(1000, 50);
      expect(Number(balance2)).to.be.closeTo(2000, 50);
    });
  });
});

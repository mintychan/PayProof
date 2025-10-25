import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  EncryptedPayroll,
  EncryptedPayroll__factory,
  StreamRecipientHook,
  StreamRecipientHook__factory,
} from "../typechain-types";

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

  async function decryptBalance(streamKey: string, account: HardhatEthersSigner) {
    const handle = await payroll.connect(account).encryptedBalanceOf.staticCall(streamKey);
    await payroll.connect(account).encryptedBalanceOf(streamKey);
    return fhevm.userDecryptEuint(FhevmType.euint128, handle, payrollAddress, account);
  }

  async function decryptRate(streamKey: string, account: HardhatEthersSigner) {
    const stream = await payroll.getStream(streamKey);
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

  async function createStreamWithRate(
    ratePerSecond: number,
    cadence = 30 * DAY,
    employer = signers.employer,
    employee = signers.employee,
  ) {
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

    const streamKey = await payroll.computeStreamId(employer.address, employee.address);
    const numericId = await payroll.streamIdFor(streamKey);
    return { streamKey, numericId };
  }

  describe("Stream Creation", function () {
    it("creates a stream with encrypted rate", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const stream = await payroll.getStream(streamKey);

      expect(stream.employer).to.equal(signers.employer.address);
      expect(stream.employee).to.equal(signers.employee.address);
      expect(stream.status).to.equal(1); // Active
      expect(Number(stream.cadenceInSeconds)).to.equal(30 * DAY);
    });

    it("creates stream with custom cadence", async function () {
      const { streamKey } = await createStreamWithRate(10, 7 * DAY);
      const stream = await payroll.getStream(streamKey);
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

      const streamKey = await payroll.computeStreamId(signers.employer.address, signers.employee.address);
      const stream = await payroll.getStream(streamKey);
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
      const { streamKey: streamKey1 } = await createStreamWithRate(5, 30 * DAY, signers.employer, signers.employee);
      const { streamKey: streamKey2 } = await createStreamWithRate(10, 30 * DAY, signers.employer, signers.verifier);

      const stream1 = await payroll.getStream(streamKey1);
      const stream2 = await payroll.getStream(streamKey2);

      expect(stream1.employee).to.equal(signers.employee.address);
      expect(stream2.employee).to.equal(signers.verifier.address);
    });

    it("allows same employee to receive from different employers", async function () {
      const { streamKey: streamKey1 } = await createStreamWithRate(5, 30 * DAY, signers.employer, signers.employee);
      const { streamKey: streamKey2 } = await createStreamWithRate(10, 30 * DAY, signers.verifier, signers.employee);

      const stream1 = await payroll.getStream(streamKey1);
      const stream2 = await payroll.getStream(streamKey2);

      expect(stream1.employer).to.equal(signers.employer.address);
      expect(stream2.employer).to.equal(signers.verifier.address);
    });

    it("assigns numeric stream ids and allows reverse lookup", async function () {
      const { streamKey, numericId } = await createStreamWithRate(5);
      const lookedUpId = await payroll.streamIdFor(streamKey);
      expect(lookedUpId).to.equal(numericId);

      const lookedUpKey = await payroll.streamKeyFor(numericId);
      expect(lookedUpKey).to.equal(streamKey);

      await expect(payroll.streamKeyFor(999n)).to.be.revertedWithCustomError(payroll, "StreamNotFound");
    });
  });

  describe("Stream Configuration", function () {
    it("updates cancelable and transferable flags", async function () {
      const { streamKey } = await createStreamWithRate(6);

      await expect(
        payroll.connect(signers.employer).configureStream(streamKey, false, false),
      ).to.emit(payroll, "StreamConfigured");

      const configAfterDisable = await payroll.getStreamConfig(streamKey);
      expect(configAfterDisable.cancelable).to.equal(false);
      expect(configAfterDisable.transferable).to.equal(false);

      await expect(
        payroll.connect(signers.employer).cancelStream(streamKey),
      ).to.be.revertedWithCustomError(payroll, "StreamNotCancelable");

      await payroll.connect(signers.employer).configureStream(streamKey, true, true);
      const configAfterEnable = await payroll.getStreamConfig(streamKey);
      expect(configAfterEnable.cancelable).to.equal(true);
      expect(configAfterEnable.transferable).to.equal(true);
    });
  });

  describe("Balance Accrual", function () {
    it("accrues encrypted balances over time", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamKey);

      const clearBalance = await decryptBalance(streamKey, signers.employee);
      expect(Number(clearBalance)).to.be.closeTo(Number(5n * 3600n), 16);
    });

    it("accrues correctly over multiple sync calls", async function () {
      const { streamKey } = await createStreamWithRate(10);

      // First accrual
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);
      const balance1 = await decryptBalance(streamKey, signers.employee);

      // Second accrual
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);
      const balance2 = await decryptBalance(streamKey, signers.employee);

      expect(Number(balance1)).to.be.closeTo(10000, 100);
      expect(Number(balance2)).to.be.closeTo(20000, 100);
    });

    it("accrues from current time when startTime is 0", async function () {
      const { streamKey } = await createStreamWithRate(10);

      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamKey);
      const balance = await decryptBalance(streamKey, signers.employee);

      // Should accrue approximately 10 * 1000 = 10000
      expect(Number(balance)).to.be.closeTo(10000, 200);
    });
  });

  describe("Top Up", function () {
    it("tops up stream balance", async function () {
      const { streamKey } = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();
      await payroll
        .connect(signers.employer)
        .topUp(streamKey, topUp.handles[0], topUp.inputProof);

      const clearAfterTopUp = await decryptBalance(streamKey, signers.employee);
      expect(Number(clearAfterTopUp)).to.be.closeTo(1000, 16);
    });

    it("emits StreamToppedUp event", async function () {
      const { streamKey } = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();

      await expect(
        payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof)
      ).to.emit(payroll, "StreamToppedUp");
    });

    it("allows multiple top ups", async function () {
      const { streamKey } = await createStreamWithRate(3);

      const topUp1 = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(500n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp1.handles[0], topUp1.inputProof);

      const topUp2 = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(300n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp2.handles[0], topUp2.inputProof);

      const balance = await decryptBalance(streamKey, signers.employee);
      expect(Number(balance)).to.be.closeTo(800, 16);
    });

    it("rejects non-employer top up", async function () {
      const { streamKey } = await createStreamWithRate(1);

      const amount = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(100)
        .encrypt();

      await expect(
        payroll.connect(signers.verifier).topUp(streamKey, amount.handles[0], amount.inputProof),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });
  });

  describe("Pause and Resume", function () {
    it("pauses and resumes stream accrual", async function () {
      const { streamKey } = await createStreamWithRate(3);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      const clearAfterTopUp = await decryptBalance(streamKey, signers.employee);
      expect(Number(clearAfterTopUp)).to.be.closeTo(1000, 16);

      await payroll.connect(signers.employer).pauseStream(streamKey);
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      const clearPaused = await decryptBalance(streamKey, signers.employee);
      expect(Number(clearPaused)).to.be.closeTo(1000, 16);

      await payroll.connect(signers.employer).resumeStream(streamKey);
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const clearResumed = await decryptBalance(streamKey, signers.employee);
      expect(Number(clearResumed)).to.be.greaterThan(1000);
    });

    it("emits StreamPaused event", async function () {
      const { streamKey } = await createStreamWithRate(3);
      await expect(payroll.connect(signers.employer).pauseStream(streamKey)).to.emit(payroll, "StreamPaused");
    });

    it("emits StreamResumed event", async function () {
      const { streamKey } = await createStreamWithRate(3);
      await payroll.connect(signers.employer).pauseStream(streamKey);
      await expect(payroll.connect(signers.employer).resumeStream(streamKey)).to.emit(payroll, "StreamResumed");
    });

    it("maintains paused status correctly", async function () {
      const { streamKey } = await createStreamWithRate(3);
      await payroll.connect(signers.employer).pauseStream(streamKey);

      const stream = await payroll.getStream(streamKey);
      expect(stream.status).to.equal(2); // Paused
    });

    it("maintains active status before pause", async function () {
      const { streamKey } = await createStreamWithRate(3);

      const stream = await payroll.getStream(streamKey);
      expect(stream.status).to.equal(1); // Active
    });

    it("rejects non-employer pause", async function () {
      const { streamKey } = await createStreamWithRate(1);

      await expect(
        payroll.connect(signers.verifier).pauseStream(streamKey),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });

    it("rejects non-employer resume", async function () {
      const { streamKey } = await createStreamWithRate(1);
      await payroll.connect(signers.employer).pauseStream(streamKey);

      await expect(
        payroll.connect(signers.verifier).resumeStream(streamKey),
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });
  });

  describe("Balance Tracking", function () {
    it("tracks accrued balance for employee", async function () {
      const { streamKey } = await createStreamWithRate(10);

      // Accrue some balance
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const balance = await decryptBalance(streamKey, signers.employee);
      expect(Number(balance)).to.be.greaterThan(0);
      expect(Number(balance)).to.be.closeTo(10000, 200);
    });

    it("allows both employer and employee to view balance", async function () {
      const { streamKey } = await createStreamWithRate(10);

      await ethers.provider.send("evm_increaseTime", [500]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const employeeBalance = await decryptBalance(streamKey, signers.employee);
      const employerBalance = await decryptBalance(streamKey, signers.employer);

      expect(Number(employeeBalance)).to.equal(Number(employerBalance));
      expect(Number(employeeBalance)).to.be.closeTo(5000, 200);
    });
  });

  describe("Cancel Stream", function () {
    it("allows employer to cancel stream", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await payroll.connect(signers.employer).cancelStream(streamKey);

      const stream = await payroll.getStream(streamKey);
      expect(stream.status).to.equal(3); // Cancelled
    });

    it("emits StreamCancelled event", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await expect(payroll.connect(signers.employer).cancelStream(streamKey))
        .to.emit(payroll, "StreamCancelled");
    });

    it("rejects non-employer cancellation", async function () {
      const { streamKey } = await createStreamWithRate(5);

      await expect(
        payroll.connect(signers.thirdParty).cancelStream(streamKey)
      ).to.be.revertedWithCustomError(payroll, "NotEmployer");
    });

    it("sets status to cancelled", async function () {
      const { streamKey } = await createStreamWithRate(5);
      await payroll.connect(signers.employer).cancelStream(streamKey);

      const stream = await payroll.getStream(streamKey);
      expect(stream.status).to.equal(3); // Cancelled
    });
  });

  describe("Hooks", function () {
    let hook: StreamRecipientHook;

    beforeEach(async function () {
      const hookFactory = (await ethers.getContractFactory("StreamRecipientHook")) as StreamRecipientHook__factory;
      hook = (await hookFactory.deploy()) as StreamRecipientHook;
      await hook.waitForDeployment();
    });

    it("enforces admin allowlist for hooks", async function () {
      await expect(
        payroll.connect(signers.employee).allowHook(await hook.getAddress(), true),
      ).to.be.revertedWithCustomError(payroll, "NotAuthorized");

      await expect(payroll.allowHook(await hook.getAddress(), true)).to.emit(payroll, "HookAllowed");
      await expect(payroll.allowHook(await hook.getAddress(), false)).to.emit(payroll, "HookAllowed");
    });

    it("registers stream hook after allowlist and forwards withdrawals", async function () {
      const { streamKey } = await createStreamWithRate(4);
      const hookAddress = await hook.getAddress();

      await expect(
        payroll.connect(signers.employer).setStreamHook(streamKey, hookAddress),
      ).to.be.revertedWithCustomError(payroll, "HookNotAllowlisted");

      await payroll.allowHook(hookAddress, true);

      await expect(
        payroll.connect(signers.employer).setStreamHook(streamKey, hookAddress),
      ).to.emit(payroll, "StreamHookUpdated");

      const config = await payroll.getStreamConfig(streamKey);
      expect(config.hook).to.equal(hookAddress);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(500n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(
        payroll.connect(signers.employee).withdrawMax(streamKey, signers.employee.address),
      ).to.emit(hook, "HookWithdrawn");
    });

    it("notifies hook on cancel", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const hookAddress = await hook.getAddress();
      await payroll.allowHook(hookAddress, true);
      await payroll.connect(signers.employer).setStreamHook(streamKey, hookAddress);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(250n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(payroll.connect(signers.employer).cancelStream(streamKey)).to.emit(hook, "HookCancelled");
    });
  });

  describe("Withdrawals", function () {
    it("withdraws maximum amount and keeps stream active", async function () {
      const { streamKey } = await createStreamWithRate(8);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(1000n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      await expect(
        payroll.connect(signers.employee).withdrawMax(streamKey, signers.employee.address),
      ).to.emit(payroll, "StreamWithdrawn");

      const remaining = await decryptBalance(streamKey, signers.employee);
      expect(Number(remaining)).to.be.closeTo(0, 1);

      const updatedStream = await payroll.getStream(streamKey);
      expect(updatedStream.status).to.equal(1); // Active

      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const reaccrued = await decryptBalance(streamKey, signers.employee);
      expect(Number(reaccrued)).to.be.greaterThan(0);
    });

    it("settles cancelled stream after final withdrawal", async function () {
      const { streamKey } = await createStreamWithRate(6);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(400n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).cancelStream(streamKey);

      await expect(
        payroll.connect(signers.employee).withdrawMax(streamKey, signers.employee.address),
      )
        .to.emit(payroll, "StreamWithdrawn")
        .and.to.emit(payroll, "StreamSettled");

      const settledStream = await payroll.getStream(streamKey);
      expect(settledStream.status).to.equal(4); // Settled
    });

    it("authorises employer to withdraw on behalf of employee", async function () {
      const { streamKey } = await createStreamWithRate(9);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(500n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(
        payroll.connect(signers.employer).withdrawMax(streamKey, signers.employee.address),
      ).to.emit(payroll, "StreamWithdrawn");
    });

    it("rejects unauthorized withdrawer", async function () {
      const { streamKey } = await createStreamWithRate(7);

      const topUp = await fhevm
        .createEncryptedInput(payrollAddress, signers.employer.address)
        .add128(100n)
        .encrypt();
      await payroll.connect(signers.employer).topUp(streamKey, topUp.handles[0], topUp.inputProof);

      await expect(
        payroll.connect(signers.thirdParty).withdrawMax(streamKey, signers.thirdParty.address),
      ).to.be.revertedWithCustomError(payroll, "NotAuthorized");
    });
  });

  describe("Admin Controls", function () {
    it("transfers admin rights", async function () {
      await expect(payroll.transferAdmin(signers.employee.address)).to.emit(payroll, "AdminTransferred");

      await expect(
        payroll.allowHook(signers.verifier.address, true),
      ).to.be.revertedWithCustomError(payroll, "NotAuthorized");

      await expect(
        payroll.connect(signers.employee).allowHook(signers.verifier.address, true),
      ).to.emit(payroll, "HookAllowed");
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
      const { streamKey } = await createStreamWithRate(7, 14 * DAY);
      const stream = await payroll.getStream(streamKey);

      expect(stream.employer).to.equal(signers.employer.address);
      expect(stream.employee).to.equal(signers.employee.address);
      expect(stream.status).to.equal(1); // Active
      expect(Number(stream.cadenceInSeconds)).to.equal(14 * DAY);
    });

    it("allows employer to view encrypted rate", async function () {
      const { streamKey: streamKeyEmployer } = await createStreamWithRate(12);
      const rate = await decryptRate(streamKeyEmployer, signers.employer);
      expect(Number(rate)).to.equal(12);
    });

    it("allows employee to view encrypted rate", async function () {
      const { streamKey: streamKeyEmployee } = await createStreamWithRate(15);
      const rate = await decryptRate(streamKeyEmployee, signers.employee);
      expect(Number(rate)).to.equal(15);
    });
  });

  describe("Edge Cases", function () {
    it("handles very small rates", async function () {
      const { streamKey } = await createStreamWithRate(1);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const balance = await decryptBalance(streamKey, signers.employee);
      expect(Number(balance)).to.be.closeTo(100, 10);
    });

    it("handles very large rates", async function () {
      const largeRate = 1000000;
      const { streamKey } = await createStreamWithRate(largeRate);

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);
      await payroll.connect(signers.employer).syncStream(streamKey);

      const balance = await decryptBalance(streamKey, signers.employee);
      // Balance should be in the ballpark of largeRate * 10
      // Allow for timing overhead in test environment
      expect(Number(balance)).to.be.greaterThan(largeRate * 5);
      expect(Number(balance)).to.be.lessThan(largeRate * 20);
    });

    it("handles zero initial balance", async function () {
      const { streamKey } = await createStreamWithRate(5);
      const balance = await decryptBalance(streamKey, signers.employee);
      expect(Number(balance)).to.equal(0);
    });

    it("maintains separate balances for multiple streams", async function () {
      // Employee receives from two different employers
      const { streamKey: streamKey1 } = await createStreamWithRate(10, 30 * DAY, signers.employer, signers.employee);
      const { streamKey: streamKey2 } = await createStreamWithRate(20, 30 * DAY, signers.verifier, signers.employee);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      await payroll.connect(signers.employer).syncStream(streamKey1);
      await payroll.connect(signers.verifier).syncStream(streamKey2);

      const balance1 = await decryptBalance(streamKey1, signers.employee);
      const balance2 = await decryptBalance(streamKey2, signers.employee);

      expect(Number(balance1)).to.be.closeTo(1000, 50);
      expect(Number(balance2)).to.be.closeTo(2000, 50);
    });
  });
});

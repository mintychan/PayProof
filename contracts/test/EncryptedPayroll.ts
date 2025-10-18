import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedPayroll, EncryptedPayroll__factory } from "../typechain-types";

const DAY = 24 * 60 * 60;

type Signers = {
  employer: HardhatEthersSigner;
  employee: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
};

async function deployFixture(): Promise<{ payroll: EncryptedPayroll; payrollAddress: string }> {
  const factory = (await ethers.getContractFactory("EncryptedPayroll")) as EncryptedPayroll__factory;
  const payroll = (await factory.deploy()) as EncryptedPayroll;
  const payrollAddress = await payroll.getAddress();
  return { payroll, payrollAddress };
}

describe("EncryptedPayroll (fhEVM)", function () {
  let signers: Signers;
  let payroll: EncryptedPayroll;
  let payrollAddress: string;

  async function decryptBalance(streamId: string, account: HardhatEthersSigner) {
    const handle = await payroll.connect(account).encryptedBalanceOf.staticCall(streamId);
    await payroll.connect(account).encryptedBalanceOf(streamId);
    return fhevm.userDecryptEuint(FhevmType.euint128, handle, payrollAddress, account);
  }

  before(async function () {
    const [employer, employee, verifier] = await ethers.getSigners();
    signers = { employer, employee, verifier };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    ({ payroll, payrollAddress } = await deployFixture());
  });

  async function createStreamWithRate(ratePerSecond: number, cadence = 30 * DAY) {
    const encryptedRate = await fhevm
      .createEncryptedInput(payrollAddress, signers.employer.address)
      .add64(ratePerSecond)
      .encrypt();

    const tx = await payroll
      .connect(signers.employer)
      .createStream(
        signers.employee.address,
        encryptedRate.handles[0],
        encryptedRate.inputProof,
        cadence,
        0,
      );
    await tx.wait();

    return encryptedRate.handles[0];
  }

  it("creates a stream and accrues encrypted balances", async function () {
    await createStreamWithRate(5);
    const streamId = await payroll.computeStreamId(signers.employer.address, signers.employee.address);

    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    await payroll.connect(signers.employer).syncStream(streamId);

    const clearBalance = await decryptBalance(streamId, signers.employee);
    expect(Number(clearBalance)).to.be.closeTo(Number(5n * 3600n), 16);
  });

  it("top ups, pauses, and resumes stream accrual", async function () {
    await createStreamWithRate(3);
    const streamId = await payroll.computeStreamId(signers.employer.address, signers.employee.address);

    const topUp = await fhevm
      .createEncryptedInput(payrollAddress, signers.employer.address)
      .add128(1000n)
      .encrypt();
    await payroll
      .connect(signers.employer)
      .topUp(streamId, topUp.handles[0], topUp.inputProof);

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

  it("rejects non-employer modifications", async function () {
    await createStreamWithRate(1);
    const streamId = await payroll.computeStreamId(signers.employer.address, signers.employee.address);

    const amount = await fhevm
      .createEncryptedInput(payrollAddress, signers.employer.address)
      .add128(100)
      .encrypt();

    await expect(
      payroll.connect(signers.verifier).topUp(streamId, amount.handles[0], amount.inputProof),
    ).to.be.revertedWithCustomError(payroll, "NotEmployer");
  });
});

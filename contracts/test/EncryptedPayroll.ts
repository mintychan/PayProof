import { expect } from "chai";
import { ethers } from "hardhat";

const DAY = 24 * 60 * 60;

describe("EncryptedPayroll", () => {
  async function deployFixture() {
    const [employer, employee, other] = await ethers.getSigners();
    const Payroll = await ethers.getContractFactory("EncryptedPayroll");
    const payroll = await Payroll.deploy();
    await payroll.waitForDeployment();
    return { payroll, employer, employee, other };
  }

  it("creates a stream and accrues encrypted balances", async () => {
    const { payroll, employer, employee } = await deployFixture();
    const ratePerSecond = 5n;
    const cadence = 30 * DAY;

    const tx = await payroll
      .connect(employer)
      .createStream(employee.address, ratePerSecond, cadence, 0);
    const receipt = await tx.wait();
    const streamId = receipt?.logs[0]?.topics[1];
    expect(streamId).to.not.be.undefined;

    const id = await payroll.computeStreamId(employer.address, employee.address);
    expect(streamId).to.equal(id);

    // advance the clock by one hour and sync
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    await payroll.syncStream(id);

    const balance = await payroll.encryptedBalanceOf(id);
    expect(Number(balance)).to.be.closeTo(Number(ratePerSecond * 3600n), 10);
  });

  it("top ups and pauses a stream", async () => {
    const { payroll, employer, employee } = await deployFixture();
    const rate = 3n;
    await payroll.connect(employer).createStream(employee.address, rate, 14 * DAY, 0);
    const streamId = await payroll.computeStreamId(employer.address, employee.address);

    await payroll.connect(employer).topUp(streamId, 1_000n);
    let balance = await payroll.encryptedBalanceOf(streamId);
    expect(Number(balance)).to.be.closeTo(1000, 10);

    await payroll.connect(employer).pauseStream(streamId);
    const streamData = await payroll.getStream(streamId);
    expect(streamData[4]).to.equal(EncryptedPayroll_StreamStatus.Paused);

    await ethers.provider.send("evm_increaseTime", [600]);
    await ethers.provider.send("evm_mine", []);
    balance = await payroll.encryptedBalanceOf(streamId);
    // paused stream should not accrue new balance
    expect(Number(balance)).to.be.closeTo(1000, 10);
  });

  it("resumes and cancels a stream", async () => {
    const { payroll, employer, employee } = await deployFixture();
    const rate = 2n;
    await payroll.connect(employer).createStream(employee.address, rate, 7 * DAY, 0);
    const streamId = await payroll.computeStreamId(employer.address, employee.address);

    await payroll.connect(employer).pauseStream(streamId);
    await ethers.provider.send("evm_increaseTime", [600]);
    await ethers.provider.send("evm_mine", []);

    await payroll.connect(employer).resumeStream(streamId);
    await ethers.provider.send("evm_increaseTime", [600]);
    await ethers.provider.send("evm_mine", []);
    await payroll.syncStream(streamId);

    const balanceAfterResume = await payroll.encryptedBalanceOf(streamId);
    expect(Number(balanceAfterResume)).to.be.closeTo(Number(rate * 600n), 10);

    await payroll.connect(employer).cancelStream(streamId);
    const streamData = await payroll.getStream(streamId);
    expect(streamData[4]).to.equal(EncryptedPayroll_StreamStatus.Cancelled);
  });

  it("rejects duplicate streams", async () => {
    const { payroll, employer, employee } = await deployFixture();
    await payroll.connect(employer).createStream(employee.address, 1n, 7 * DAY, 0);
    await expect(
      payroll.connect(employer).createStream(employee.address, 1n, 7 * DAY, 0)
    ).to.be.revertedWithCustomError(payroll, "StreamAlreadyExists");
  });

  it("rejects non-employer modifications", async () => {
    const { payroll, employer, employee, other } = await deployFixture();
    await payroll.connect(employer).createStream(employee.address, 1n, 7 * DAY, 0);
    const streamId = await payroll.computeStreamId(employer.address, employee.address);
    await expect(payroll.connect(other).topUp(streamId, 100n)).to.be.revertedWithCustomError(payroll, "NotEmployer");
  });
});

// Hardhat flattens enums to namespaced constants when using TypeChain.
// To keep the test self-contained we mirror the enum indexes here.
const enum EncryptedPayroll_StreamStatus {
  None,
  Active,
  Paused,
  Cancelled
}

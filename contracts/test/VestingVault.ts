import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  ConfidentialVestingVault,
  ConfidentialVestingVault__factory,
  ConfidentialETH,
  ConfidentialETH__factory,
  MockERC20,
  MockERC20__factory,
} from "../typechain-types";

const DAY = 24 * 60 * 60;
const YEAR = 365 * DAY;

describe("ConfidentialVestingVault (fhEVM)", function () {
  let vault: ConfidentialVestingVault;
  let confidentialToken: ConfidentialETH;
  let underlying: MockERC20;
  let admin: any;
  let employer: any;
  let beneficiary: any;
  let vaultAddress: string;

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    [admin, employer, beneficiary] = await ethers.getSigners();

    const mockFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
    underlying = (await mockFactory.deploy("Mock WETH", "mWETH", 18)) as MockERC20;
    await underlying.waitForDeployment();

    const confFactory = (await ethers.getContractFactory("ConfidentialETH")) as ConfidentialETH__factory;
    confidentialToken = (await confFactory.deploy(await underlying.getAddress(), "ipfs://payproof-ceth")) as ConfidentialETH;
    await confidentialToken.waitForDeployment();

    const vaultFactory = (await ethers.getContractFactory("ConfidentialVestingVault")) as ConfidentialVestingVault__factory;
    vault = (await vaultFactory.deploy(await confidentialToken.getAddress())) as ConfidentialVestingVault;
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();

    await vault.connect(admin).allowEmployer(employer.address, true);
  });

  async function fundEmployer(amount: bigint) {
    await underlying.mint(employer.address, amount);
    await underlying.connect(employer).approve(await confidentialToken.getAddress(), amount);
    await confidentialToken.connect(employer).wrap(employer.address, amount);
    const expiry = Math.floor(Date.now() / 1000) + YEAR;
    await confidentialToken.connect(employer).setOperator(await vault.getAddress(), expiry);
  }

  async function encryptAmount(amount: bigint) {
    const input = await fhevm.createEncryptedInput(vaultAddress, employer.address);
    input.add64(amount);
    return input.encrypt();
  }

  it("creates vesting schedules and stores encrypted totals", async function () {
    const totalAmount = 1_000_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    const tx = await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        0,
        0,
        30 * DAY,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );
    const receipt = await tx.wait();
    const createdTopic = vault.interface.getEvent("VestingCreated").topicHash;
    const createdLog = receipt?.logs.find(
      (log) => log.address === vaultAddress && log.topics[0] === createdTopic,
    );
    if (!createdLog) {
      throw new Error("VestingCreated event not found");
    }
    const parsed = vault.interface.parseLog(createdLog);

    expect(parsed.name).to.equal("VestingCreated");
    expect(parsed.args.sponsor).to.equal(employer.address);
    expect(parsed.args.beneficiary).to.equal(beneficiary.address);

    expect(parsed.args.totalAmountHandle).to.not.equal(ethers.ZeroHash);
  });

  it("lets beneficiaries withdraw after cliff", async function () {
    const totalAmount = 500_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    const tx = await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        0,
        0,
        10 * DAY,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );
    await tx.wait();

    await ethers.provider.send("evm_increaseTime", [11 * DAY]);
    await ethers.provider.send("evm_mine", []);

    const withdrawTx = await vault.connect(beneficiary).withdraw(1, beneficiary.address);
    const withdrawReceipt = await withdrawTx.wait();
    const withdrawnTopic = vault.interface.getEvent("VestingWithdrawn").topicHash;
    const withdrawnLog = withdrawReceipt?.logs.find(
      (log) => log.address === vaultAddress && log.topics[0] === withdrawnTopic,
    );
    if (!withdrawnLog) {
      throw new Error("VestingWithdrawn event not found");
    }
    const parsedWithdraw = vault.interface.parseLog(withdrawnLog);
    expect(parsedWithdraw.args.amountHandle).to.not.equal(ethers.ZeroHash);
  });

  it("allows sponsors to cancel cancelable schedules", async function () {
    const totalAmount = 750_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    const currentBlock = await ethers.provider.getBlock("latest");
    const startTime = (currentBlock?.timestamp || 0) + DAY;
    const cliffTime = startTime + DAY;

    await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        startTime,
        cliffTime,
        30 * DAY,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );

    await expect(vault.connect(employer).cancel(1)).to.emit(vault, "VestingCancelled");

    const schedule = await vault.getSchedule(1);
    expect(schedule.revoked).to.equal(true);
    await expect(vault.connect(beneficiary).withdraw(1, beneficiary.address)).to.be.revertedWithCustomError(
      vault,
      "VestingRevokedAlready",
    );
  });

  it("reverts withdraw before cliff is reached", async function () {
    const totalAmount = 500_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    const currentBlock = await ethers.provider.getBlock("latest");
    const startTime = (currentBlock?.timestamp || 0) + 1;
    const cliffTime = startTime + 30 * DAY; // cliff 30 days in the future

    await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        startTime,
        cliffTime,
        YEAR,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );

    // Try to withdraw before cliff -- should revert
    await expect(
      vault.connect(beneficiary).withdraw(1, beneficiary.address),
    ).to.be.revertedWithCustomError(vault, "CliffNotReached");
  });

  it("reverts cancel by non-sponsor and non-admin", async function () {
    const totalAmount = 500_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        0,
        0,
        30 * DAY,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );

    // beneficiary is neither sponsor nor admin -- should revert
    await expect(
      vault.connect(beneficiary).cancel(1),
    ).to.be.revertedWithCustomError(vault, "NotAuthorized");
  });

  it("allows double withdrawal tracking across multiple withdrawals", async function () {
    const totalAmount = 600_000n;
    await fundEmployer(totalAmount);
    const encrypted = await encryptAmount(totalAmount);

    await vault
      .connect(employer)
      .createVesting(
        beneficiary.address,
        0,
        0,
        30 * DAY,
        0,
        true,
        encrypted.handles[0],
        encrypted.inputProof,
      );

    // Advance past cliff and partially through vesting
    await ethers.provider.send("evm_increaseTime", [10 * DAY]);
    await ethers.provider.send("evm_mine", []);

    // First withdrawal
    const tx1 = await vault.connect(beneficiary).withdraw(1, beneficiary.address);
    const receipt1 = await tx1.wait();
    const withdrawnTopic = vault.interface.getEvent("VestingWithdrawn").topicHash;
    const withdrawnLog1 = receipt1?.logs.find(
      (log) => log.address === vaultAddress && log.topics[0] === withdrawnTopic,
    );
    expect(withdrawnLog1).to.not.be.undefined;

    // Advance more time so more tokens vest
    await ethers.provider.send("evm_increaseTime", [10 * DAY]);
    await ethers.provider.send("evm_mine", []);

    // Second withdrawal should also succeed with remaining releasable amount
    const tx2 = await vault.connect(beneficiary).withdraw(1, beneficiary.address);
    const receipt2 = await tx2.wait();
    const withdrawnLog2 = receipt2?.logs.find(
      (log) => log.address === vaultAddress && log.topics[0] === withdrawnTopic,
    );
    expect(withdrawnLog2).to.not.be.undefined;

    const parsed1 = vault.interface.parseLog(withdrawnLog1!);
    const parsed2 = vault.interface.parseLog(withdrawnLog2!);

    // Both withdrawals should have non-zero amount handles
    expect(parsed1!.args.amountHandle).to.not.equal(ethers.ZeroHash);
    expect(parsed2!.args.amountHandle).to.not.equal(ethers.ZeroHash);
  });
});

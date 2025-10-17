import { expect } from "chai";
import { ethers } from "hardhat";

const DAY = 24 * 60 * 60;

describe("IncomeOracle", () => {
  async function setup() {
    const [employer, employee, verifier] = await ethers.getSigners();
    const Payroll = await ethers.getContractFactory("EncryptedPayroll");
    const payroll = await Payroll.deploy();
    await payroll.waitForDeployment();

    const Oracle = await ethers.getContractFactory("IncomeOracle");
    const oracle = await Oracle.deploy(await payroll.getAddress());
    await oracle.waitForDeployment();

    return { payroll, oracle, employer, employee, verifier };
  }

  it("attests income against threshold", async () => {
    const { payroll, oracle, employer, employee, verifier } = await setup();
    const rate = 2n; // encrypted units per second
    await payroll.connect(employer).createStream(employee.address, rate, 30 * DAY, 0);
    const streamId = await payroll.computeStreamId(employer.address, employee.address);

    // 30 day projection should be 2 * 30 * 86400 = 5,184,000
    const projection = await payroll.projectedIncome(streamId, 30);
    expect(projection).to.equal(rate * BigInt(30 * DAY));

    const threshold = projection / 2n;
    const tx = await oracle
      .connect(verifier)
      .attestMonthlyIncome(employer.address, employee.address, threshold, 30);
    const receipt = await tx.wait();
    const oracleAddress = await oracle.getAddress();
    const event = receipt?.logs?.find((log) => log.address.toLowerCase() === oracleAddress.toLowerCase());
    expect(event).to.exist;

    const decoded = oracle.interface.decodeEventLog("Attested", event?.data || "0x", event?.topics || []);
    expect(decoded.meets).to.equal(true);
    expect(decoded.tier).to.equal(IncomeOracle_Tier.A);
  });

  it("fails threshold when projected income is insufficient", async () => {
    const { payroll, oracle, employer, employee, verifier } = await setup();
    await payroll.connect(employer).createStream(employee.address, 1n, 30 * DAY, 0);

    const highThreshold = BigInt(5 * 30 * DAY);
    const attestation = await oracle
      .connect(verifier)
      .attestMonthlyIncome.staticCall(employer.address, employee.address, highThreshold, 30);

    expect(attestation.meets).to.equal(false);
    expect(attestation.tier).to.equal(IncomeOracle_Tier.None);
  });

  it("rejects zero lookback windows", async () => {
    const { payroll, oracle, employer, employee, verifier } = await setup();
    await payroll.connect(employer).createStream(employee.address, 1n, 30 * DAY, 0);

    await expect(
      oracle.connect(verifier).attestMonthlyIncome(employer.address, employee.address, 100n, 0)
    ).to.be.revertedWithCustomError(oracle, "InvalidLookback");
  });
});

const enum IncomeOracle_Tier {
  None,
  C,
  B,
  A
}

import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deployed Contracts Integration Test", function () {
  // Skip if not on Sepolia
  before(function () {
    if (process.env.SKIP_INTEGRATION_TESTS === "true") {
      this.skip();
    }
  });

  it("Should verify deployed EncryptedPayroll contract", async function () {
    const payrollAddress = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT;
    
    if (!payrollAddress) {
      this.skip();
    }

    const [signer] = await ethers.getSigners();
    const EncryptedPayroll = await ethers.getContractFactory("EncryptedPayroll");
    const payroll = EncryptedPayroll.attach(payrollAddress!);

    // Test basic functions that don't require FHE
    const protocolId = await payroll.protocolId();
    expect(protocolId).to.equal(10001n);

    // Test computeStreamId
    const streamId = await payroll.computeStreamId(
      signer.address,
      "0x0000000000000000000000000000000000000001"
    );
    expect(streamId).to.be.a("string");
    expect(streamId).to.have.length(66); // 0x + 64 hex chars
  });

  it("Should verify deployed IncomeOracle contract", async function () {
    const oracleAddress = process.env.NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT;
    const payrollAddress = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT;
    
    if (!oracleAddress || !payrollAddress) {
      this.skip();
    }

    const IncomeOracle = await ethers.getContractFactory("IncomeOracle");
    const oracle = IncomeOracle.attach(oracleAddress!);

    // Verify the oracle points to the correct payroll contract
    const linkedPayroll = await oracle.payroll();
    expect(linkedPayroll.toLowerCase()).to.equal(payrollAddress!.toLowerCase());
  });
});
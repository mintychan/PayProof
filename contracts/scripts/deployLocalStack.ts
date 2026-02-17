import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying local stack with", deployer.address);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockWeth = await MockERC20.deploy("Mock WETH", "mWETH", 18);
  await mockWeth.waitForDeployment();
  const mockWethAddress = await mockWeth.getAddress();
  console.log("Mock WETH deployed at", mockWethAddress);

  const ConfidentialETH = await ethers.getContractFactory("ConfidentialETH");
  const confEth = await ConfidentialETH.deploy(mockWethAddress, "ipfs://payproof-ceth-local");
  await confEth.waitForDeployment();
  const confEthAddress = await confEth.getAddress();
  console.log("ConfidentialETH deployed at", confEthAddress);

  const Payroll = await ethers.getContractFactory("EncryptedPayroll");
  const payroll = await Payroll.deploy(confEthAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("EncryptedPayroll deployed at", payrollAddress);

  const Oracle = await ethers.getContractFactory("IncomeOracle");
  const oracle = await Oracle.deploy(payrollAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("IncomeOracle deployed at", oracleAddress);

  const allowTx = await payroll.allowHook(oracleAddress, true);
  await allowTx.wait();
  console.log("Oracle allowlisted as hook");

  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const setOperatorTx = await confEth.setOperator(payrollAddress, expiry);
  await setOperatorTx.wait();
  console.log("Payroll set as operator on ConfidentialETH");

  console.log("\nLocal stack ready:");
  console.log("Mock WETH:", mockWethAddress);
  console.log("ConfidentialETH:", confEthAddress);
  console.log("EncryptedPayroll:", payrollAddress);
  console.log("IncomeOracle:", oracleAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

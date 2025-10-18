import { ethers } from "hardhat";

async function main() {
  console.log("Deploying EncryptedPayroll and IncomeOracle contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy EncryptedPayroll first
  console.log("\n📦 Deploying EncryptedPayroll...");
  const EncryptedPayroll = await ethers.getContractFactory("EncryptedPayroll");
  const encryptedPayroll = await EncryptedPayroll.deploy();
  await encryptedPayroll.waitForDeployment();
  const payrollAddress = await encryptedPayroll.getAddress();
  console.log("✅ EncryptedPayroll deployed to:", payrollAddress);

  // Deploy IncomeOracle with EncryptedPayroll address
  console.log("\n📦 Deploying IncomeOracle...");
  const IncomeOracle = await ethers.getContractFactory("IncomeOracle");
  const incomeOracle = await IncomeOracle.deploy(payrollAddress);
  await incomeOracle.waitForDeployment();
  const oracleAddress = await incomeOracle.getAddress();
  console.log("✅ IncomeOracle deployed to:", oracleAddress);

  // Save deployment info
  console.log("\n✅ Deployment successful!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("EncryptedPayroll Address:", payrollAddress);
  console.log("IncomeOracle Address:", oracleAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📝 Add these to your .env file:");
  console.log(`NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT="${payrollAddress}"`);
  console.log(`NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT="${oracleAddress}"`);
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${payrollAddress}`);
  console.log(`npx hardhat verify --network sepolia ${oracleAddress} ${payrollAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

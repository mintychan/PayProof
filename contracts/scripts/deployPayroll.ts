import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EncryptedPayroll with account:", deployer.address);

  const tokenAddress = process.env.CONFIDENTIAL_TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("CONFIDENTIAL_TOKEN_ADDRESS env var is required");
  }

  const Payroll = await ethers.getContractFactory("EncryptedPayroll");
  const payroll = await Payroll.deploy(tokenAddress);
  await payroll.waitForDeployment();

  const address = await payroll.getAddress();
  console.log("EncryptedPayroll deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

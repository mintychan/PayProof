import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EncryptedPayroll with account:", deployer.address);

  const Payroll = await ethers.getContractFactory("EncryptedPayroll");
  const payroll = await Payroll.deploy();
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

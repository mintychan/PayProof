import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ConfidentialVestingVault with account:", deployer.address);

  const confidentialToken = process.env.CONFIDENTIAL_TOKEN_ADDRESS;
  if (!confidentialToken) {
    throw new Error("CONFIDENTIAL_TOKEN_ADDRESS env var is required");
  }

  const Vesting = await ethers.getContractFactory("ConfidentialVestingVault");
  const vault = await Vesting.deploy(confidentialToken);
  await vault.waitForDeployment();

  console.log("ConfidentialVestingVault deployed to:", await vault.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

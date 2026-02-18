import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ConfidentialUSDC with account:", deployer.address);

  const usdcAddress = process.env.USDC_TOKEN_ADDRESS;
  if (!usdcAddress) {
    throw new Error("USDC_TOKEN_ADDRESS env var is required");
  }

  const contractURI = process.env.CONFIDENTIAL_USDC_CONTRACT_URI || "";

  const ConfidentialUSDC = await ethers.getContractFactory("ConfidentialUSDC");
  const token = await ConfidentialUSDC.deploy(usdcAddress, contractURI);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("ConfidentialUSDC deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

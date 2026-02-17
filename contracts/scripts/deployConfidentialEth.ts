import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ConfidentialETH with account:", deployer.address);

  const underlying = process.env.UNDERLYING_WETH_ADDRESS;
  if (!underlying) {
    throw new Error("UNDERLYING_WETH_ADDRESS env var is required");
  }

  const contractURI = process.env.CONFIDENTIAL_ETH_CONTRACT_URI || "";

  const ConfidentialETH = await ethers.getContractFactory("ConfidentialETH");
  const token = await ConfidentialETH.deploy(underlying, contractURI);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("ConfidentialETH deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

import { ethers } from "hardhat";

async function main() {
  console.log("Deploying StreamingPayroll contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy StreamingPayroll
  const StreamingPayroll = await ethers.getContractFactory("StreamingPayroll");
  const streamingPayroll = await StreamingPayroll.deploy();

  await streamingPayroll.waitForDeployment();

  const address = await streamingPayroll.getAddress();
  console.log("StreamingPayroll deployed to:", address);

  // Save deployment info
  console.log("\n✅ Deployment successful!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📝 Add this to your .env file:");
  console.log(`NEXT_PUBLIC_STREAMING_PAYROLL_CONTRACT="${address}"`);
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

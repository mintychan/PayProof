import { ethers } from "hardhat";

/**
 * Deploys the full PayProof contract stack.
 *
 * Usage:
 *   Local:   npx hardhat run scripts/deployAll.ts
 *   Sepolia: npx hardhat run scripts/deployAll.ts --network sepolia
 *
 * For Sepolia, set these in .env:
 *   UNDERLYING_WETH_ADDRESS  - WETH on Sepolia (e.g. 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14)
 *   USDC_TOKEN_ADDRESS       - USDC on Sepolia (optional, skip cUSDC if not set)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isLocal = network.chainId === 31337n;
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PayProof Full Stack Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", isLocal ? "hardhat (local)" : network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("");

  // ── Step 1: Deploy or use existing underlying token ───────────────
  let underlyingAddress: string;

  if (isLocal) {
    console.log("[1/7] Deploying MockERC20 (WETH)...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20.deploy("Mock WETH", "mWETH", 18);
    await mock.waitForDeployment();
    underlyingAddress = await mock.getAddress();
    console.log("  MockERC20 (WETH):", underlyingAddress);
  } else {
    underlyingAddress = process.env.UNDERLYING_WETH_ADDRESS || "";
    if (!underlyingAddress) {
      throw new Error(
        "UNDERLYING_WETH_ADDRESS env var required for non-local deployment.\n" +
        "Sepolia WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
      );
    }
    console.log("[1/7] Using existing WETH:", underlyingAddress);
  }

  // ── Step 2: Deploy ConfidentialETH ────────────────────────────────
  console.log("[2/7] Deploying ConfidentialETH...");
  const ConfidentialETH = await ethers.getContractFactory("ConfidentialETH");
  const ceth = await ConfidentialETH.deploy(underlyingAddress, "");
  await ceth.waitForDeployment();
  const cethAddress = await ceth.getAddress();
  console.log("  ConfidentialETH:", cethAddress);

  // ── Step 3: Deploy EncryptedPayroll ──────────────────────────────
  console.log("[3/7] Deploying EncryptedPayroll...");
  const Payroll = await ethers.getContractFactory("EncryptedPayroll");
  const payroll = await Payroll.deploy(cethAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("  EncryptedPayroll:", payrollAddress);

  // ── Step 4: Deploy IncomeOracle ──────────────────────────────────
  console.log("[4/7] Deploying IncomeOracle...");
  const Oracle = await ethers.getContractFactory("IncomeOracle");
  const oracle = await Oracle.deploy(payrollAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("  IncomeOracle:", oracleAddress);

  // ── Step 5: Deploy ConfidentialVestingVault ───────────────────────
  console.log("[5/7] Deploying ConfidentialVestingVault...");
  const Vesting = await ethers.getContractFactory("ConfidentialVestingVault");
  const vesting = await Vesting.deploy(cethAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("  ConfidentialVestingVault:", vestingAddress);

  // ── Step 6: Deploy ConfidentialTokenFactory ───────────────────────
  console.log("[6/7] Deploying ConfidentialTokenFactory...");
  const Factory = await ethers.getContractFactory("ConfidentialTokenFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("  ConfidentialTokenFactory:", factoryAddress);

  // ── Step 7: Deploy ConfidentialUSDC (optional) ────────────────────
  let cusdcAddress = "";
  const usdcUnderlying = process.env.USDC_TOKEN_ADDRESS || "";
  if (isLocal) {
    console.log("[7/7] Deploying MockERC20 (USDC) + ConfidentialUSDC...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await mockUsdc.waitForDeployment();
    const mockUsdcAddress = await mockUsdc.getAddress();

    const ConfidentialUSDC = await ethers.getContractFactory("ConfidentialUSDC");
    const cusdc = await ConfidentialUSDC.deploy(mockUsdcAddress, "");
    await cusdc.waitForDeployment();
    cusdcAddress = await cusdc.getAddress();
    console.log("  MockERC20 (USDC):", mockUsdcAddress);
    console.log("  ConfidentialUSDC:", cusdcAddress);
  } else if (usdcUnderlying) {
    console.log("[7/7] Deploying ConfidentialUSDC...");
    const ConfidentialUSDC = await ethers.getContractFactory("ConfidentialUSDC");
    const cusdc = await ConfidentialUSDC.deploy(usdcUnderlying, "");
    await cusdc.waitForDeployment();
    cusdcAddress = await cusdc.getAddress();
    console.log("  ConfidentialUSDC:", cusdcAddress);
  } else {
    console.log("[7/7] Skipping ConfidentialUSDC (no USDC_TOKEN_ADDRESS set)");
  }

  // ── Post-deploy: Configure permissions ────────────────────────────
  console.log("\nConfiguring permissions...");

  // Allow IncomeOracle as a hook on the payroll contract
  const allowTx = await payroll.allowHook(oracleAddress, true);
  await allowTx.wait();
  console.log("  IncomeOracle allowlisted as hook on EncryptedPayroll");

  // Set EncryptedPayroll as operator on ConfidentialETH
  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const setOpTx = await ceth.setOperator(payrollAddress, expiry);
  await setOpTx.wait();
  console.log("  EncryptedPayroll set as operator on ConfidentialETH (1 year)");

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployment complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Contract Addresses:");
  console.log("  ConfidentialETH:          ", cethAddress);
  console.log("  EncryptedPayroll:         ", payrollAddress);
  console.log("  IncomeOracle:             ", oracleAddress);
  console.log("  ConfidentialVestingVault: ", vestingAddress);
  console.log("  ConfidentialTokenFactory: ", factoryAddress);
  if (cusdcAddress) {
    console.log("  ConfidentialUSDC:         ", cusdcAddress);
  }

  console.log("\n.env variables for apps/web/.env:");
  console.log("─────────────────────────────────────────────");
  if (isLocal) {
    console.log(`NEXT_PUBLIC_SEPOLIA_RPC_URL=http://127.0.0.1:8545`);
  }
  console.log(`NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT="${payrollAddress}"`);
  console.log(`NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT="${oracleAddress}"`);
  console.log(`NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_TOKEN="${cethAddress}"`);
  console.log(`NEXT_PUBLIC_PAYPROOF_VESTING_CONTRACT="${vestingAddress}"`);
  if (cusdcAddress) {
    console.log(`NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_USDC="${cusdcAddress}"`);
  }

  if (!isLocal) {
    console.log("\nVerify on Etherscan:");
    console.log(`  npx hardhat verify --network sepolia ${cethAddress} "${underlyingAddress}" ""`);
    console.log(`  npx hardhat verify --network sepolia ${payrollAddress} "${cethAddress}"`);
    console.log(`  npx hardhat verify --network sepolia ${oracleAddress} "${payrollAddress}"`);
    console.log(`  npx hardhat verify --network sepolia ${vestingAddress} "${cethAddress}"`);
    console.log(`  npx hardhat verify --network sepolia ${factoryAddress}`);
    if (cusdcAddress) {
      console.log(`  npx hardhat verify --network sepolia ${cusdcAddress} "${usdcUnderlying}" ""`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

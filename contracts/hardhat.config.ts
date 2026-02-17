import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@typechain/hardhat";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";

import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

const externalNetworkAccounts = process.env.DEPLOYER_KEY
  ? [process.env.DEPLOYER_KEY]
  : {
      mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC
    };

const hardhatNetworkAccounts = {
  mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC
};

const createOptimizerSettings = () => ({
  optimizer: {
    enabled: true,
    runs: 200
  }
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
        settings: createOptimizerSettings()
      },
      {
        version: "0.8.24",
        settings: createOptimizerSettings()
      }
    ]
  },
  defaultNetwork: "hardhat",
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts"
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: hardhatNetworkAccounts
    },
    protocol: {
      url: process.env.PROTOCOL_RPC_URL || "https://protocol-rpc-placeholder",
      accounts: externalNetworkAccounts
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia-rpc-placeholder",
      chainId: 11155111,
      accounts: externalNetworkAccounts
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  mocha: {
    timeout: 400000
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: false
  }
};

export default config;

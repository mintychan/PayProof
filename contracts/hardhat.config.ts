import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@typechain/hardhat";
import "solidity-coverage";

import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

const accounts = process.env.DEPLOYER_KEY
  ? [process.env.DEPLOYER_KEY]
  : {
      mnemonic: process.env.MNEMONIC || DEFAULT_MNEMONIC
    };

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
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
      accounts
    },
    protocol: {
      url: process.env.PROTOCOL_RPC_URL || "https://protocol-rpc-placeholder",
      accounts
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia-rpc-placeholder",
      chainId: 11155111,
      accounts
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  mocha: {
    timeout: 400000
  }
};

export default config;

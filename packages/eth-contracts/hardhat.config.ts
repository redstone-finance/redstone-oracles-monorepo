import "dotenv/config";
import "hardhat-gas-reporter";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import { HardhatUserConfig } from "hardhat/config";

import "./src/generate-mint-calldata";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000, // it slightly increases gas for contract deployment but decreases for user interactions
      },
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.MAINNET_ETHERSCAN_API_KEY || "",
      sepolia:process.env.SEPOLIA_ETHERSCAN_API_KEY || "",
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
  mocha: {
    timeout: 300_000, // 300 seconds
  },
  networks: {
    hardhat: {
      blockGasLimit: 30_000_000,
    },
    mainnet: {
      url: "https://ethereum-rpc.publicnode.com",
      accounts,
    },
    sepolia: {
      url: `https://ethereum-sepolia-rpc.publicnode.com`,
      accounts,
    },
    goerli: {
      url: process.env.GOERLI_URL ?? "https://eth-goerli.public.blastapi.io",
      accounts,
    },
  },
};

export default config;

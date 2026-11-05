import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import { defineConfig } from "hardhat/config";
import { type EdrNetworkUserConfig } from "hardhat/types/config";

const SIMULATED_NETWORK = {
  type: "edr-simulated",
  blockGasLimit: 0x1fffffffffffff,
  transactionGasCap: false,
} satisfies EdrNetworkUserConfig;

export default defineConfig({
  plugins: [hardhatMocha],
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000, // it slightly increases gas for contract deployment but decreases for user interactions
      },
    },
  },
  test: {
    mocha: {
      timeout: 300_000, // 300 seconds
    },
  },
  networks: {
    default: SIMULATED_NETWORK,
  },
});

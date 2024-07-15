import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      allowBlocksWithSameTimestamp: true,
    },
  },
};

export default config;

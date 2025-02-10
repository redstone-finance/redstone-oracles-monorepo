import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  mocha: {
    timeout: 2_000,
  },
  etherscan: {
    apiKey: {
      avalanche: "NZK513SPB5MRI2281ZFZYZW6VJIVW3XMBB",
      arbitrumOne: "47R2FXKX2VVRDA2Y12XXJEKIKGUJ1AQP3B",
      sei: "anything",
    },
    customChains: [
      {
        network: "sei",
        chainId: 1329,
        urls: {
          apiURL: "https://seitrace.com/pacific-1/api",
          browserURL: "https://seitrace.com",
        },
      },
    ],
  },
  networks: {
    mainnet: {
      url: "https://eth-mainnet.public.blastapi.io",
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
    },
    celo_baklava: {
      url: "https://baklava-forno.celo-testnet.org",
    },
    merlin: {
      url: "https://rpc.merlinchain.io",
    },
    cyber: {
      url: "https://cyber.alt.technology",
    },
    bounceBit: {
      url: "https://fullnode-mainnet.bouncebitapi.com",
    },
    corn: {
      url: "https://rpc.ankr.com/corn_maizenet",
    },
    cornTestnet: {
      url: "https://testnet-rpc.usecorn.com",
    },
    sonic: {
      url: "https://rpc.soniclabs.com",
    },
    rootstock: {
      url: "https://rootstock-mainnet.public.blastapi.io",
    },
    sei: {
      url: "https://evm-rpc.sei-apis.com",
    },
    berachain: {
      url: "https://rpc.berachain.com",
    },
  },
};

export default config;

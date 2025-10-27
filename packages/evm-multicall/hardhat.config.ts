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
      tac: "anything",
      katana: "anything",
      zeroGravity: "anything",
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
      {
        network: "tac",
        chainId: 239,
        urls: {
          apiURL: "https://explorer.tac.build/api",
          browserURL: "https://explorer.tac.build",
        },
      },
      {
        network: "katana",
        chainId: 747474,
        urls: {
          apiURL: "https://explorer.katanarpc.com/api",
          browserURL: "https://explorer.katanarpc.com",
        },
      },
      {
        network: "zeroGravity",
        chainId: 16661,
        urls: {
          apiURL: "https://chainscan.0g.ai/open/api",
          browserURL: "https://chainscan.0g.ai/",
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
    celo_alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
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
    berachainTestnet: {
      url: "https://bepolia.rpc.berachain.com",
    },
    storyTestnet: {
      url: "https://aeneid.storyrpc.io",
    },
    tac: {
      url: "https://rpc.ankr.com/tac",
    },
    katana: {
      url: "https://rpc.katana.network",
    },
    tacSpbTestnet: {
      url: "https://spb.rpc.tac.build",
    },
    zeroGravity: {
      url: "http://evmrpc.0g.ai",
    },
    zeroGravityTestnet: {
      url: "https://evmrpc-testnet.0g.ai",
    },
    incentivTestnet: {
      url: "https://rpc2.testnet.incentiv.io/",
    },
    incentiv: {
      url: "https://rpc.incentiv.io",
    },
    edenTestnet: {
      url: "https://ev-reth-eden-testnet.binarybuilders.services:8545",
    },
    plasma: {
      url: "https://rpc.plasma.to",
    },
    giwaTestnet: {
      url: "https://sepolia-rpc.giwa.io",
    },
    etherlinkShadownetTestnet: {
      url: "https://node.shadownet.etherlink.com",
    },
  },
};

export default config;

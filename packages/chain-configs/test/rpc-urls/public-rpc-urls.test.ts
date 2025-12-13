import { RpcUrlsPerChain } from "../../scripts/read-ssm-rpc-urls";
import { getLocalChainConfigs } from "../../src";
import { validateNetworkRpcUrls } from "./common";

const CHAINS_TO_SKIP_RPC_CHECK = ["MegaETH Testnet", "MegaETH Mainnet"];

const validatePublicRpcUrls = () => {
  const chainConfigs = getLocalChainConfigs();
  const rpcUrlsPerChain: RpcUrlsPerChain = {};

  for (const { name, networkId, publicRpcUrls } of Object.values(chainConfigs)) {
    if (name === "hardhat" || CHAINS_TO_SKIP_RPC_CHECK.includes(name)) {
      continue;
    }
    rpcUrlsPerChain[name] = {
      networkId,
      rpcUrls: publicRpcUrls,
    };
  }

  validateNetworkRpcUrls(rpcUrlsPerChain);
};

describe("Public Rpc Urls Validation", function () {
  before(function () {
    if (!process.env.TEST_RPC) {
      this.skip();
    }
  });

  validatePublicRpcUrls();
});

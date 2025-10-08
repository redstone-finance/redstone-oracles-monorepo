import { FetchRpcUrlsFromSsmResult, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import { isEvmNetworkId, loggerFactory } from "@redstone-finance/utils";
import { existsSync, readFileSync } from "fs";

const ChainConfigs = getLocalChainConfigs();
const _chainNames = Object.keys(ChainConfigs);
type ChainName = (typeof _chainNames)[number];

const CHAIN_NAME_TO_HARDHAT_NETWORK_NAME: {
  [key: ChainName]: string | undefined;
} = {
  ethereum: "mainnet",
  "ethereum-sepolia": "sepolia",
  "blast-sepolia": "blast-testnet",
  "bnb-testnet": "bscTestnet",
};

const HARDHAT_NETWORK_NAME_TO_CHAIN_NAME = Object.fromEntries(
  Object.entries(CHAIN_NAME_TO_HARDHAT_NETWORK_NAME).map(([key, value]) => [value, key])
) as {
  [key: string]: ChainName | undefined;
};

type NetworkUserConfig = {
  name: string;
  chainId: number;
  url: string;
  etherScanApi?: string;
  accounts: string[];
};

const logger = loggerFactory("hardhat-network-configs");

type NetworksUserConfig = { [key: ChainName]: NetworkUserConfig };

const maybeReadPrivateRpcUrlsFromFile = (): FetchRpcUrlsFromSsmResult => {
  if (!existsSync("private-rpc-urls.json")) {
    return {};
  }
  try {
    const rpcUrls = JSON.parse(
      readFileSync("private-rpc-urls.json", "utf8")
    ) as FetchRpcUrlsFromSsmResult;
    return rpcUrls;
  } catch (e) {
    logger.warn(
      "Failed to read or parse `private-rpc-urls.json` file. Public RPC URLs will be used",
      e
    );
    return {};
  }
};

export const hardhatNetworksConfig = (accounts: string[] = []): NetworksUserConfig => {
  const networks: NetworksUserConfig = {};
  const privateRpcUrlsFile = maybeReadPrivateRpcUrlsFromFile();

  for (const [chainName, config] of Object.entries(ChainConfigs)) {
    if (
      config.publicRpcUrls.length === 0 ||
      chainName === "hardhat" ||
      !isEvmNetworkId(config.networkId)
    ) {
      continue;
    }

    const privateRpcUrls = privateRpcUrlsFile[config.networkId];
    const rpcUrl = privateRpcUrls?.length ? privateRpcUrls[0] : config.publicRpcUrls[0];

    networks[CHAIN_NAME_TO_HARDHAT_NETWORK_NAME[chainName] ?? chainName] = {
      name: config.name,
      chainId: config.networkId,
      url: rpcUrl,
      etherScanApi: config.etherScanApi,
      accounts,
    } as NetworkUserConfig;
  }

  return networks;
};

export function convertHardhatNetworkNameToChainName(hardhatNetworkName: string) {
  return HARDHAT_NETWORK_NAME_TO_CHAIN_NAME[hardhatNetworkName] ?? hardhatNetworkName;
}

import { EvmPriceFeedContractAdapter } from "@redstone-finance/evm-adapters";
import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { isEvmNetworkId, NetworkId, NonEvmNetworkId } from "@redstone-finance/utils";
import { providers } from "ethers";
import {
  fetchParsedRpcUrlsFromSsmByNetworkIdMemoized,
  getProviderMemoized,
} from "../provider/get-provider";
import { MonitoringEnv } from "./get-monitoring-contract-adapter";
import { getPriceFeedAdapter } from "./get-price-feed-adapter";

export type PriceFeedAdapterCreator = (
  address: string,
  feedName?: string,
  withRounds?: boolean
) => Promise<PriceFeedAdapter>;

export async function getPriceFeedAdapterCreator(
  networkId: NetworkId,
  env: MonitoringEnv,
  overrides?: { provider?: providers.Provider; rpcUrls?: string[] }
): Promise<PriceFeedAdapterCreator> {
  if (isEvmNetworkId(networkId)) {
    return await getEvmPriceFeedAdapterCreator(networkId, env, overrides?.provider);
  } else {
    return await getNonEvmPriceFeedAdapterCreator(networkId, env, overrides?.rpcUrls);
  }
}

async function getEvmPriceFeedAdapterCreator(
  networkId: number,
  env: MonitoringEnv,
  overrideProvider?: providers.Provider
): Promise<PriceFeedAdapterCreator> {
  const provider = overrideProvider ?? (await getProviderMemoized(networkId, env));

  return (address) => {
    return Promise.resolve(new EvmPriceFeedContractAdapter(provider, address));
  };
}

async function getNonEvmPriceFeedAdapterCreator(
  networkId: NonEvmNetworkId,
  env: MonitoringEnv,
  overrideRpcUrls?: string[]
): Promise<PriceFeedAdapterCreator> {
  const rpcUrls =
    overrideRpcUrls ?? (await fetchParsedRpcUrlsFromSsmByNetworkIdMemoized(networkId, env));

  return async (address, feedId, withRounds) =>
    await getPriceFeedAdapter(networkId, address, rpcUrls, feedId, withRounds);
}

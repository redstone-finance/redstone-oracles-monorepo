import { fetchParsedRpcUrlsFromSsmByNetworkId } from "@redstone-finance/chain-configs";
import {
  EvmPriceFeedContract,
  PriceFeedWithRounds,
  PriceFeedWithRoundsAbi,
} from "@redstone-finance/evm-adapters";
import { IPriceFeedContract } from "@redstone-finance/sdk";
import { isEvmNetworkId, NetworkId } from "@redstone-finance/utils";
import { Contract, providers } from "ethers";
import { getProviderMemoized } from "../provider/get-provider";
import { MonitoringEnv } from "./get-monitoring-contract-connector";
import { getPriceFeedContractConnector } from "./get-price-feed-contract-connector";
import { NonEvmPriceFeedContract } from "./NonEvmPriceFeedContract";

type PriceFeedContractCreator = (address: string) => Promise<IPriceFeedContract>;

export async function getPriceFeedContractCreator(
  networkId: NetworkId,
  env: MonitoringEnv,
  readerAddress?: string,
  overrides?: { provider?: providers.Provider; rpcUrls?: string[] }
): Promise<PriceFeedContractCreator> {
  if (isEvmNetworkId(networkId)) {
    return await getEvmPriceFeedContractCreator(networkId, env, overrides?.provider);
  } else {
    return await getNonEvmPriceFeedContractCreator(
      networkId,
      env,
      readerAddress,
      overrides?.rpcUrls
    );
  }
}

async function getEvmPriceFeedContractCreator(
  networkId: number,
  env: MonitoringEnv,
  overrideProvider?: providers.Provider
): Promise<PriceFeedContractCreator> {
  const provider = overrideProvider ?? (await getProviderMemoized(networkId, env));

  return (address) => {
    return Promise.resolve(
      new EvmPriceFeedContract(
        new Contract(address, PriceFeedWithRoundsAbi, provider) as PriceFeedWithRounds
      )
    );
  };
}

async function getNonEvmPriceFeedContractCreator(
  networkId: NetworkId,
  env: MonitoringEnv,
  readerAddress?: string,
  overrideRpcUrls?: string[]
): Promise<PriceFeedContractCreator> {
  const rpcUrls = overrideRpcUrls ?? (await fetchParsedRpcUrlsFromSsmByNetworkId(networkId, env));

  return async (address) =>
    await NonEvmPriceFeedContract.createWithConnector(
      getPriceFeedContractConnector(networkId, address, rpcUrls, readerAddress)
    );
}

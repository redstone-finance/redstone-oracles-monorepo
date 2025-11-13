import { fetchParsedRpcUrlsFromSsmByNetworkId } from "@redstone-finance/chain-configs";
import {
  EvmPriceFeedContract,
  PriceFeedWithRounds,
  PriceFeedWithRoundsAbi,
} from "@redstone-finance/evm-adapters";
import { IPriceFeedContract } from "@redstone-finance/sdk";
import { isEvmNetworkId, NetworkId } from "@redstone-finance/utils";
import { Contract } from "ethers";
import { getProviderMemoized } from "../provider/get-provider";
import { MonitoringEnv } from "./get-monitoring-contract-connector";
import { getPriceFeedContractConnector } from "./get-price-feed-contract-connector";
import { NonEvmPriceFeedContract } from "./NonEvmPriceFeedContract";

type PriceFeedContractCreator = (address: string) => Promise<IPriceFeedContract>;

export async function getPriceFeedContractCreator(
  networkId: NetworkId,
  env: MonitoringEnv,
  readerAddress?: string
): Promise<PriceFeedContractCreator> {
  if (isEvmNetworkId(networkId)) {
    return await getEvmPriceFeedContractCreator(networkId, env);
  } else {
    return await getNonEvmPriceFeedContractCreator(networkId, env, readerAddress);
  }
}

async function getEvmPriceFeedContractCreator(
  networkId: number,
  env: MonitoringEnv
): Promise<PriceFeedContractCreator> {
  const provider = await getProviderMemoized(networkId, env);

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
  readerAddress?: string
): Promise<PriceFeedContractCreator> {
  const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(networkId, env);

  return async (address) =>
    await NonEvmPriceFeedContract.createWithConnector(
      getPriceFeedContractConnector(networkId, address, rpcUrls, readerAddress)
    );
}

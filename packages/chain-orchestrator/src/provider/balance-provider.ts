import {
  Env,
  fetchParsedRpcUrlsFromSsmByNetworkId,
  NetworkId,
} from "@redstone-finance/chain-configs";
import {
  AdapterType,
  isNonEvmAdapterType,
} from "@redstone-finance/on-chain-relayer-common";
import { BigNumber } from "ethers";
import {
  EvmBlockchainService,
  getNonEvmBlockchainService,
  getProviderWithRpcUrls,
} from "../index";
import { getProviderMemoized } from "./get-provider";

export interface BalanceProvider {
  getBalance(addressOrName: string, blockTag?: number): Promise<BigNumber>;
  getBlockNumber(): Promise<number>;
}

const SINGLE_RPC_TIMEOUT_MILLISECONDS = 10_000;
const ALL_RPC_TIMEOUT_MILLISECONDS = 40_000;

export const getBalanceProvider = async (
  networkId: NetworkId,
  env: Env,
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> => {
  if (isNonEvmAdapterType(adapterType)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(
      networkId,
      env,
      "main"
    );
    return await getBalanceProviderWithRpcUrls(networkId, rpcUrls, adapterType);
  } else {
    return await getProviderMemoized(networkId, env);
  }
};

export async function getBalanceProviderWithRpcUrls(
  networkId: NetworkId,
  rpcUrls: string[],
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> {
  if (!rpcUrls.length) {
    return;
  }

  if (isNonEvmAdapterType(adapterType)) {
    return getNonEvmBlockchainService(networkId, rpcUrls);
  } else {
    return new EvmBlockchainService(
      await getProviderWithRpcUrls(networkId, rpcUrls, {
        singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
        allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
      })
    );
  }
}

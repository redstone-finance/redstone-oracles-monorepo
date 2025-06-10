import {
  constructNetworkId,
  Env,
  fetchParsedRpcUrlsFromSsmByNetworkId,
} from "@redstone-finance/chain-configs";
import {
  AdapterType,
  getNonEvmNetworkName,
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
  chainId: number,
  env: Env,
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> => {
  if (isNonEvmAdapterType(adapterType)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(
      constructNetworkId(chainId, getNonEvmNetworkName(adapterType)),
      env,
      "main"
    );
    return await getBalanceProviderWithRpcUrls(chainId, rpcUrls, adapterType);
  } else {
    return await getProviderMemoized(chainId, env);
  }
};

export async function getBalanceProviderWithRpcUrls(
  chainId: number,
  rpcUrls: string[],
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> {
  if (!rpcUrls.length) {
    return;
  }

  if (isNonEvmAdapterType(adapterType)) {
    return getNonEvmBlockchainService(
      rpcUrls,
      getNonEvmNetworkName(adapterType),
      chainId
    );
  } else {
    return new EvmBlockchainService(
      await getProviderWithRpcUrls(chainId, rpcUrls, {
        singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
        allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
      })
    );
  }
}

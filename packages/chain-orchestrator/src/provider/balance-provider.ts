import {
  Env,
  fetchParsedRpcUrlsFromSsmByNetworkId,
} from "@redstone-finance/chain-configs";
import {
  isNonEvmNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
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
  env: Env
): Promise<BalanceProvider | undefined> => {
  if (isNonEvmNetworkId(networkId)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(
      networkId,
      env,
      "main"
    );
    return await getBalanceProviderWithRpcUrls(networkId, rpcUrls);
  } else {
    return await getProviderMemoized(networkId, env);
  }
};

export async function getBalanceProviderWithRpcUrls(
  networkId: NetworkId,
  rpcUrls: string[]
): Promise<BalanceProvider | undefined> {
  if (!rpcUrls.length) {
    return undefined;
  }

  try {
    if (isNonEvmNetworkId(networkId)) {
      return getNonEvmBlockchainService(networkId, rpcUrls);
    } else {
      return new EvmBlockchainService(
        await getProviderWithRpcUrls(networkId, rpcUrls, {
          singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
          allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
        })
      );
    }
  } catch (e) {
    console.error(RedstoneCommon.stringifyError(e));
    return undefined;
  }
}

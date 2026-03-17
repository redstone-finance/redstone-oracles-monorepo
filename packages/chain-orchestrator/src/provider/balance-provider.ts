import { Env, fetchChainConfigs, getChainConfigByNetworkId } from "@redstone-finance/chain-configs";
import { BalanceProvider } from "@redstone-finance/multichain-kit";
import { isNonEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { EvmBlockchainService } from "../blockchain-service/EvmBlockchainService";
import { getNonEvmBlockchainService } from "../blockchain-service/get-non-evm-blockchain-service";
import { CurrencyTokenBalanceProvider } from "./CurrencyTokenBalanceProvider";
import {
  fetchParsedRpcUrlsFromSsmByNetworkIdMemoized,
  getProviderWithRpcUrls,
} from "./get-provider";

const SINGLE_RPC_TIMEOUT_MILLISECONDS = 10_000;
const ALL_RPC_TIMEOUT_MILLISECONDS = 40_000;

export const getBalanceProvider = async (
  networkId: NetworkId,
  env: Env
): Promise<BalanceProvider | undefined> => {
  const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkIdMemoized(networkId, env, "main");
  if (isNonEvmNetworkId(networkId)) {
    return await getBalanceProviderWithRpcUrls(networkId, rpcUrls);
  } else {
    return await getBalanceProviderMemoized(networkId, rpcUrls);
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
      return await getNonEvmBlockchainService(networkId, rpcUrls);
    } else {
      const provider = await getProviderWithRpcUrls(networkId, rpcUrls, {
        singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
        allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
      });

      return await getEvmBalanceProvider(provider, networkId);
    }
  } catch (e) {
    console.error(RedstoneCommon.stringifyError(e));

    return undefined;
  }
}

export async function getEvmBalanceProvider(
  provider: providers.Provider,
  networkId: NetworkId
): Promise<BalanceProvider> {
  const { gasCurrencyToken } = getChainConfigByNetworkId(await fetchChainConfigs(), networkId);

  return gasCurrencyToken
    ? new CurrencyTokenBalanceProvider(provider, gasCurrencyToken.address)
    : new EvmBlockchainService(provider);
}

export const getBalanceProviderMemoized = RedstoneCommon.memoize({
  functionToMemoize: getBalanceProviderWithRpcUrls,
  ttl: 60_000,
});

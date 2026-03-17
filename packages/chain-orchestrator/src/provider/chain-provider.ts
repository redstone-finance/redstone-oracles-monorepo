import {
  Env,
  fetchChainConfigs,
  fetchParsedRpcUrlsFromSsmByNetworkId,
  getChainConfigByNetworkId,
} from "@redstone-finance/chain-configs";
import { BalanceProvider, BlockProvider } from "@redstone-finance/multichain-kit";
import { isNonEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { EvmBlockchainService } from "../blockchain-service/EvmBlockchainService";
import { getNonEvmBlockchainService } from "../blockchain-service/get-non-evm-blockchain-service";
import { CurrencyTokenBalanceProvider } from "./CurrencyTokenBalanceProvider";
import { getProviderMemoized, getProviderWithRpcUrls } from "./get-provider";

const SINGLE_RPC_TIMEOUT_MILLISECONDS = RedstoneCommon.secsToMs(10);
const ALL_RPC_TIMEOUT_MILLISECONDS = RedstoneCommon.secsToMs(40);

async function getChainProvider(
  networkId: NetworkId,
  env: Env
): Promise<(BalanceProvider & BlockProvider) | undefined> {
  if (isNonEvmNetworkId(networkId)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(networkId, env, "main");

    return await getChainProviderWithRpcUrls(networkId, rpcUrls);
  } else {
    const provider = await getProviderMemoized(networkId, env);

    return {
      getBalance: async (addressOrName: string, blockTag?: number) =>
        (await provider.getBalance(addressOrName, blockTag)).toBigInt(),
      getBlockNumber: () => provider.getBlockNumber(),
    };
  }
}

async function getChainProviderWithRpcUrls(
  networkId: NetworkId,
  rpcUrls: string[]
): Promise<(BalanceProvider & BlockProvider) | undefined> {
  if (!rpcUrls.length) {
    return undefined;
  }

  try {
    if (isNonEvmNetworkId(networkId)) {
      return await getNonEvmBlockchainService(networkId, rpcUrls);
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

export const getBalanceProvider = async (
  networkId: NetworkId,
  env: Env
): Promise<BalanceProvider | undefined> => {
  return await getChainProvider(networkId, env);
};

export async function getBalanceProviderWithRpcUrls(
  networkId: NetworkId,
  rpcUrls: string[]
): Promise<BalanceProvider | undefined> {
  return await getChainProviderWithRpcUrls(networkId, rpcUrls);
}

export const getBlockProvider = async (
  networkId: NetworkId,
  env: Env
): Promise<BlockProvider | undefined> => {
  return await getChainProvider(networkId, env);
};

export async function getBlockProviderWithRpcUrls(
  networkId: NetworkId,
  rpcUrls: string[]
): Promise<BlockProvider | undefined> {
  return await getChainProviderWithRpcUrls(networkId, rpcUrls);
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

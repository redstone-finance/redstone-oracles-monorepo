import { Env, fetchParsedRpcUrlsFromSsmByNetworkId } from "@redstone-finance/chain-configs";
import { EvmBlockchainService } from "@redstone-finance/evm-adapters";
import { BalanceProvider, BlockProvider } from "@redstone-finance/multichain-kit";
import { isNonEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getNonEvmBlockchainService } from "../blockchain-service/get-non-evm-blockchain-service";
import {
  DEFAULT_PROVIDER_CONFIG,
  getProviderMemoized,
  getProviderWithRpcUrls,
} from "./get-provider";

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
          ...DEFAULT_PROVIDER_CONFIG,
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

export async function getBlockProvider(
  networkId: NetworkId,
  rpcUrlsOrEnv: string[] | Env
): Promise<BlockProvider | undefined> {
  return Array.isArray(rpcUrlsOrEnv)
    ? await getChainProviderWithRpcUrls(networkId, rpcUrlsOrEnv)
    : await getChainProvider(networkId, rpcUrlsOrEnv);
}

export async function forceGetBlockProvider(
  networkId: NetworkId,
  rpcUrlsOrEnv: string[] | Env
): Promise<BlockProvider> {
  const blockProvider = await getBlockProvider(networkId, rpcUrlsOrEnv);

  if (!RedstoneCommon.isDefined(blockProvider)) {
    throw new Error(`Block provider is not defined for ${networkId}`);
  }

  return blockProvider;
}

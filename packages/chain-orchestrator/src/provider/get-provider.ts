import {
  fetchChainConfigs,
  fetchParsedRpcUrlsFromSsmByNetworkId,
  getChainConfigByNetworkId,
  type Env,
} from "@redstone-finance/chain-configs";
import { MegaProviderBuilder, MulticallDecorator } from "@redstone-finance/rpc-providers";
import { isEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { z } from "zod";

export const DEFAULT_PROVIDER_CONFIG: {
  allProvidersOperationTimeout: number;
  singleProviderOperationTimeout: number;
  useMulticall?: boolean;
} = {
  allProvidersOperationTimeout: 30_000,
  singleProviderOperationTimeout: 5_000,
  useMulticall: RedstoneCommon.getFromEnv("USE_MULTICALL_PROVIDER", z.boolean().default(true)),
};

export const getProvider = async (
  networkId: NetworkId,
  env: Env,
  config = DEFAULT_PROVIDER_CONFIG
): Promise<providers.Provider> => {
  return await getProviderWithRpcUrls(
    networkId,
    await fetchParsedRpcUrlsFromSsmByNetworkIdMemoized(networkId, env),
    config
  );
};

export const getProviderWithRpcUrls = async (
  networkId: NetworkId,
  rpcUrls: string[],
  config = DEFAULT_PROVIDER_CONFIG
): Promise<providers.Provider> => {
  if (!isEvmNetworkId(networkId)) {
    throw new Error("Non-evm networkId passed to evm provider builder.");
  }
  const chainConfig = getChainConfigByNetworkId(await fetchChainConfigs(), networkId);

  return new MegaProviderBuilder({
    rpcUrls,
    network: {
      chainId: networkId,
      name: `network-${networkId}`,
    },
    throttleLimit: 1,
    timeout: config.singleProviderOperationTimeout,
  })
    .agreement(
      {
        ignoreAgreementOnInsufficientResponses: true,
        minimalProvidersCount: 2,
        requireExplicitBlockTag: false,
        chainConfig,
        ...config,
      },
      rpcUrls.length !== 1
    )
    .addDecorator(
      (factory) => MulticallDecorator(factory),
      config.useMulticall && RedstoneCommon.isNonEmpty(chainConfig.multicall3.address)
    )
    .build();
};

export const getProviderMemoized = RedstoneCommon.memoize({
  functionToMemoize: getProvider,
  ttl: 60_000,
});

export const fetchParsedRpcUrlsFromSsmByNetworkIdMemoized = RedstoneCommon.memoize({
  functionToMemoize: fetchParsedRpcUrlsFromSsmByNetworkId,
  ttl: 58_000, // time for reaction for getProvider
});

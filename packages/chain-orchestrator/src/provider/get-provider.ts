import {
  fetchChainConfigs,
  fetchParsedRpcUrlsFromSsmByChainId,
  getChainConfigByChainId,
} from "@redstone-finance/chain-configs";
import { MonitoringEnv } from "@redstone-finance/monitoring-manifests";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";

const DEFAULT_CONFIG = {
  allProvidersOperationTimeout: 30_000,
  singleProviderOperationTimeout: 5_000,
};

export const getProvider = async (
  chainId: number | string,
  env: MonitoringEnv,
  config = DEFAULT_CONFIG
): Promise<providers.Provider> => {
  return await getProviderWithRpcUrls(
    chainId,
    await fetchParsedRpcUrlsFromSsmByChainId(chainId, env),
    config
  );
};

export const getProviderWithRpcUrls = async (
  chainId: number | string,
  rpcUrls: string[],
  config = DEFAULT_CONFIG
): Promise<providers.Provider> => {
  const chainConfigs = await fetchChainConfigs();

  return new MegaProviderBuilder({
    rpcUrls,
    network: {
      chainId: parseInt(chainId.toString()),
      name: `network-${chainId}`,
    },
    throttleLimit: 1,
    timeout: config.singleProviderOperationTimeout,
  })
    .agreement(
      {
        ignoreAgreementOnInsufficientResponses: true,
        minimalProvidersCount: 2,
        requireExplicitBlockTag: false,
        chainConfig: getChainConfigByChainId(chainConfigs, Number(chainId)),
        ...config,
      },
      rpcUrls.length !== 1
    )
    .build();
};

export const getProviderMemoized = RedstoneCommon.memoize({
  functionToMemoize: getProvider,
  ttl: 60_000,
});

import {
  fetchChainConfigs,
  fetchParsedRpcUrlsFromSsmByNetworkId,
  getChainConfigByNetworkId,
  type Env,
} from "@redstone-finance/chain-configs";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import {
  isEvmNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { providers } from "ethers";

const DEFAULT_CONFIG = {
  allProvidersOperationTimeout: 30_000,
  singleProviderOperationTimeout: 5_000,
};

export const getProvider = async (
  networkId: NetworkId,
  env: Env,
  config = DEFAULT_CONFIG
): Promise<providers.Provider> => {
  return await getProviderWithRpcUrls(
    networkId,
    await fetchParsedRpcUrlsFromSsmByNetworkId(networkId, env),
    config
  );
};

export const getProviderWithRpcUrls = async (
  networkId: NetworkId,
  rpcUrls: string[],
  config = DEFAULT_CONFIG
): Promise<providers.Provider> => {
  const chainConfig = getChainConfigByNetworkId(
    await fetchChainConfigs(),
    networkId
  );
  if (!isEvmNetworkId(networkId)) {
    throw new Error("Non-evm networkId passed to evm provider builder.");
  }

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
    .build();
};

export const getProviderMemoized = RedstoneCommon.memoize({
  functionToMemoize: getProvider,
  ttl: 60_000,
});

import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import { getRelayerMetricReporter } from "@redstone-finance/chain-orchestrator";
import { MegaProviderBuilder, ProviderDecorators } from "@redstone-finance/rpc-providers";
import { isEvmNetworkId } from "@redstone-finance/utils";
import { providers } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";
import { isRelayerTelemetryEnabled } from "../../config/relayer-telemetry";

let cachedProvider: providers.Provider | undefined;

const ACCEPTABLE_BLOCK_DIFF_IN_MS = 10_000;
const makeElectBlock = (acceptableBlockDiff: number) => (blockNumbers: number[]) => {
  const sortedBlockNumber = [...blockNumbers].sort((a, b) => b - a);
  const firstBlockNumber = sortedBlockNumber.at(-1)!;
  const secondBlockNumber = sortedBlockNumber.at(-2);

  if (!secondBlockNumber) {
    return firstBlockNumber;
  } else if (firstBlockNumber - secondBlockNumber > acceptableBlockDiff) {
    return firstBlockNumber;
  } else {
    return secondBlockNumber;
  }
};

export const getRelayerProvider = (relayerConfig: RelayerConfig) => {
  if (cachedProvider) {
    return cachedProvider;
  }

  const { rpcUrls, chainName, networkId, ethersPollingIntervalInMs } = relayerConfig;
  if (!isEvmNetworkId(networkId)) {
    throw new Error(`Non-evm networkId ${networkId} passed to evm relayer provider`);
  }

  const { avgBlockTimeMs } = getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
  const acceptableBlockDiff = Math.ceil(ACCEPTABLE_BLOCK_DIFF_IN_MS / avgBlockTimeMs);

  cachedProvider = new MegaProviderBuilder({
    rpcUrls,
    timeout: relayerConfig.singleProviderOperationTimeout,
    throttleLimit: 1,
    network: { name: chainName, chainId: networkId },
    pollingInterval: ethersPollingIntervalInMs,
    blockNumberCacheOpts: { isCacheEnabled: false, ttl: 0 },
  })
    .addDecorator(
      (factory) =>
        ProviderDecorators.SendMetricDecorator(factory, getRelayerMetricReporter(relayerConfig)),
      isRelayerTelemetryEnabled(relayerConfig)
    )
    .agreement(
      {
        singleProviderOperationTimeout: relayerConfig.singleProviderOperationTimeout,
        allProvidersOperationTimeout: relayerConfig.allProvidersOperationTimeout,
        getBlockNumberTimeoutMS: relayerConfig.getBlockNumberTimeout,
        electBlockFn: makeElectBlock(acceptableBlockDiff),
        ignoreAgreementOnInsufficientResponses: true,
      },
      rpcUrls.length > 1
    )
    .addDecorator(
      (factory) =>
        ProviderDecorators.MulticallDecorator(factory, {
          maxCallsCount: 3,
          autoResolveInterval: 100,
        }),
      relayerConfig.useMulticallProvider
    )
    .addDecorator(ProviderDecorators.Treat0xAsErrorDecorator)
    .build();

  return cachedProvider;
};

export const clearCachedRelayerProvider = () => {
  cachedProvider = undefined;
};

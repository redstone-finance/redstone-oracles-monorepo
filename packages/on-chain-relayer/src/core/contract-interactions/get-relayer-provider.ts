import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import { getTelemetrySendService, TelemetryPoint } from "@redstone-finance/internal-utils";
import { MegaProviderBuilder, ProviderDecorators } from "@redstone-finance/rpc-providers";
import { isEvmNetworkId } from "@redstone-finance/utils";
import { providers } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";
import { isRelayerTelemetryEnabled } from "../../config/relayer-telemetry";

let cachedProvider: providers.Provider | undefined;

const ACCEPTABLE_BLOCK_DIFF_IN_MS = 10_000;
const electBlock = (blockNumbers: number[], _: number, chainId: number): number => {
  const sortedBlockNumber = [...blockNumbers].sort((a, b) => b - a);
  const firstBlockNumber = sortedBlockNumber.at(-1)!;
  const secondBlockNumber = sortedBlockNumber.at(-2);

  const { avgBlockTimeMs } = getChainConfigByNetworkId(getLocalChainConfigs(), chainId);
  const acceptableBlockDiff = Math.ceil(ACCEPTABLE_BLOCK_DIFF_IN_MS / avgBlockTimeMs);

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

  const telemetrySendService = getTelemetrySendService(
    relayerConfig.telemetryUrl,
    relayerConfig.telemetryAuthorizationToken
  );

  const sendMetric = (metric: TelemetryPoint) => {
    metric.tag("relayer-network-id", relayerConfig.networkId.toString());
    metric.tag("relayer-adapter-address", relayerConfig.adapterContractAddress);
    metric.tag("relayer-fallback-offset", relayerConfig.fallbackOffsetInMilliseconds.toString());
    telemetrySendService.queueToSendMetric(metric);
  };

  cachedProvider = new MegaProviderBuilder({
    rpcUrls,
    timeout: relayerConfig.singleProviderOperationTimeout,
    throttleLimit: 1,
    network: { name: chainName, chainId: networkId },
    pollingInterval: ethersPollingIntervalInMs,
    blockNumberCacheOpts: { isCacheEnabled: false, ttl: 0 },
  })
    .addDecorator(
      (factory) => ProviderDecorators.CallMetricDecorator(factory, sendMetric),
      isRelayerTelemetryEnabled(relayerConfig)
    )
    .addDecorator(
      (factory) => ProviderDecorators.GetBlockNumberMetricDecorator(factory, sendMetric),
      isRelayerTelemetryEnabled(relayerConfig)
    )
    .agreement(
      {
        singleProviderOperationTimeout: relayerConfig.singleProviderOperationTimeout,
        allProvidersOperationTimeout: relayerConfig.allProvidersOperationTimeout,
        getBlockNumberTimeoutMS: relayerConfig.getBlockNumberTimeout,
        electBlockFn: electBlock,
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

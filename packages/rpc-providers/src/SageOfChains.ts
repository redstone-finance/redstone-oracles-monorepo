import { Provider } from "@ethersproject/providers";
import {
  ChainConfig,
  getLocalChainConfigsByNetworkId,
  NetworkId,
  NetworkIdSchema,
} from "@redstone-finance/chain-configs";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";

const logger = loggerFactory("SageOfChains");

export class SageOfChains {
  networkIdToProviderFactory: Record<
    NetworkId,
    (chainConfig: ChainConfig) => Provider
  > = {};
  networkIdToProvider: Record<NetworkId, Provider | undefined> = {};

  constructor(
    allSupportedNetworkIds: NetworkId[],
    private readonly providerFactory: (chainConfig: ChainConfig) => Provider
  ) {
    allSupportedNetworkIds.forEach((networkId) =>
      this.fillProviderFactory(networkId)
    );
  }

  private fillProviderFactory(networkId: NetworkId) {
    this.networkIdToProviderFactory[networkId] = this.providerFactory;
  }

  getProvider(networkId: NetworkId): Provider {
    const providerCached = this.networkIdToProvider[networkId];
    if (providerCached) {
      return providerCached;
    }
    const providerFactory = this.networkIdToProviderFactory[networkId];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!providerFactory) {
      throw new Error(
        `SageOfChains: missing provider factory for ${networkId}`
      );
    }
    const chainConfig = SageOfChains.getChainConfig(networkId);
    const provider = providerFactory(chainConfig);
    this.networkIdToProvider[networkId] = provider;
    return provider;
  }

  private static getChainConfig(networkId: NetworkId) {
    const chainConfigs = getLocalChainConfigsByNetworkId();
    const chainConfig = chainConfigs[networkId];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!chainConfig) {
      throw new Error(
        `SageOfChains: missing local chain config for ${networkId}`
      );
    }
    return chainConfig;
  }

  getProvidersForRequiredNetworkIds(
    requiredNetworkIds: NetworkId[]
  ): [NetworkId, Provider][] {
    return requiredNetworkIds.map((networkId) => {
      return [networkId, this.getProvider(networkId)];
    });
  }

  async getBlockNumbersPerChain(
    timeout: number
  ): Promise<Record<string, number>> {
    const chainIdToBlockTuplesResults = await Promise.allSettled(
      Object.entries(this.networkIdToProviderFactory).map(
        async ([networkId, providerFactory]) => {
          const chainConfig = SageOfChains.getChainConfig(
            NetworkIdSchema.parse(networkId)
          );
          const provider = providerFactory(chainConfig);
          const blockNumber = await getBlockNumberWithRetries(
            provider,
            timeout
          );
          return [networkId, blockNumber];
        }
      )
    );
    const chainIdToBlockTuples = chainIdToBlockTuplesResults
      .map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }
        logger.log(
          `Failed to fetch blockNumber for ${
            Object.keys(this.networkIdToProviderFactory)[index]
          } after 2 retries: ${RedstoneCommon.stringifyError(result.reason)}`
        );
        return false;
      })
      .filter((r) => !!r) as [string, number][];

    return Object.fromEntries(chainIdToBlockTuples);
  }
}

const getBlockNumberWithRetries = (
  provider: Provider,
  timeout: number
): Promise<number> =>
  RedstoneCommon.timeout(
    RedstoneCommon.retry({
      waitBetweenMs: 50,
      maxRetries: 2,
      fn: () => provider.getBlockNumber(),
      logger: logger.log,
    })(),
    timeout
  );

import { Provider } from "@ethersproject/providers";
import {
  ChainConfig,
  ChainTypeEnum,
  getChainKey,
  getLocalChainConfigsByChainIdAndType,
} from "@redstone-finance/chain-configs";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";

const logger = loggerFactory("SageOfChains");

export class SageOfChains {
  chainTypeAndIdToProviderFactory: Record<
    string,
    (chainConfig: ChainConfig) => Provider
  > = {};
  chainTypeAndIdToProvider: Record<string, Provider | undefined> = {};

  constructor(
    allSupportedChainIds: string[],
    private readonly providerFactory: (chainConfig: ChainConfig) => Provider
  ) {
    allSupportedChainIds.forEach((chainId) =>
      this.fillProviderFactoryByChainTypeAndId(chainId)
    );
  }

  private fillProviderFactoryByChainTypeAndId(chainId: string) {
    const chainTypeAndId = getChainKey(Number(chainId), ChainTypeEnum.enum.evm);
    this.chainTypeAndIdToProviderFactory[chainTypeAndId] = this.providerFactory;
  }

  getProviderByChainTypeAndId(chainTypeAndId: string): Provider {
    const providerCached = this.chainTypeAndIdToProvider[chainTypeAndId];
    if (providerCached) {
      return providerCached;
    }
    const providerFactory =
      this.chainTypeAndIdToProviderFactory[chainTypeAndId];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!providerFactory) {
      throw new Error(
        `SageOfChains: missing provider factory for ${chainTypeAndId}`
      );
    }
    const chainConfig =
      SageOfChains.getChainConfigByChainTypeAndId(chainTypeAndId);
    const provider = providerFactory(chainConfig);
    this.chainTypeAndIdToProvider[chainTypeAndId] = provider;
    return provider;
  }

  private static getChainConfigByChainTypeAndId(chainTypeAndId: string) {
    const chainConfigs = getLocalChainConfigsByChainIdAndType();
    const chainConfig = chainConfigs[chainTypeAndId];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!chainConfig) {
      throw new Error(
        `SageOfChains: missing local chain config for ${chainTypeAndId}`
      );
    }
    return chainConfig;
  }

  getProvidersForRequiredChainIds(
    requiredChainIds: number[]
  ): [number, Provider][] {
    return requiredChainIds.map((chainId) => {
      const chainTypeAndId = getChainKey(chainId, ChainTypeEnum.enum.evm);
      return [chainId, this.getProviderByChainTypeAndId(chainTypeAndId)];
    });
  }

  async getBlockNumbersPerChain(
    timeout: number
  ): Promise<Record<number, number>> {
    const chainIdToBlockTuplesResults = await Promise.allSettled(
      Object.entries(this.chainTypeAndIdToProviderFactory).map(
        async ([chainTypeAndId, providerFactory]) => {
          const chainConfig =
            SageOfChains.getChainConfigByChainTypeAndId(chainTypeAndId);
          const provider = providerFactory(chainConfig);
          const blockNumber = await getBlockNumberWithRetries(
            provider,
            timeout
          );
          return [chainConfig.chainId, blockNumber];
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
            Object.keys(this.chainTypeAndIdToProviderFactory)[index]
          } after 2 retries: ${RedstoneCommon.stringifyError(result.reason)}`
        );
        return false;
      })
      .filter((r) => !!r) as [number, number][];

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

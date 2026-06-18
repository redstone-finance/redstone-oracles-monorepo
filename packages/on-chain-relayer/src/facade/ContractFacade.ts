import { BlockProvider, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import type { UpdatePricesOptions } from "@redstone-finance/sdk";
import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import { makeDataPackagesRequestParams } from "../core/make-data-packages-request-params";
import { ContractData, ShouldUpdateContext, UpdatePricesArgs } from "../types";

const CONTRACT_DATA_CACHE_TTL_MS = RedstoneCommon.minToMs(5);

export class ContractFacade {
  private readonly logger = loggerFactory("contract-facade");
  private readonly getUniqueSignerThresholdMemoized: (blockTag?: number) => Promise<number>;
  private readonly contractDataCache: RedstoneCommon.CacheWithTtl<string, ContractData>;

  constructor(
    protected readonly adapter: WriteContractAdapter,
    protected readonly blockProvider: BlockProvider,
    { uniqueSignerThresholdCacheTtlMs = 0 } = {},
    protected cache?: DataPackagesResponseCache
  ) {
    this.getUniqueSignerThresholdMemoized = RedstoneCommon.memoize({
      functionToMemoize: (blockTag?: number) => this.getUniqueSignerThresholdFromContract(blockTag),
      ttl: uniqueSignerThresholdCacheTtlMs,
      cacheKeyBuilder: () => "uniqueSignerThresholdCached",
      cacheReporter: (isMissing) =>
        uniqueSignerThresholdCacheTtlMs || !isMissing
          ? RedstoneCommon.reportMemoizeCacheUsage(isMissing, "uniqueSignerThreshold", this.logger)
          : undefined,
    });

    this.contractDataCache = new RedstoneCommon.AutoCleanupCacheWithTtl(CONTRACT_DATA_CACHE_TTL_MS);
  }

  async getShouldUpdateContext(relayerConfig: RelayerConfig): Promise<ShouldUpdateContext> {
    const { blockTag, uniqueSignerThreshold, dataFromContract } =
      await this.getContractData(relayerConfig);

    const requestParams = makeDataPackagesRequestParams(relayerConfig, uniqueSignerThreshold);

    const dataPackages = await this.getContractParamsProvider(requestParams).requestDataPackages(
      this.cache?.isEmpty()
    );

    return {
      dataPackages,
      uniqueSignerThreshold,
      dataFromContract,
      blockTag,
      baseChecksTimestamp: Date.now(),
      historicalCache: new DataPackagesResponseCache(),
    };
  }

  getBlockNumber() {
    return this.blockProvider.getBlockNumber();
  }

  private async getContractData(relayerConfig: RelayerConfig) {
    const { dataFeeds } = relayerConfig;
    const { shouldCheckValueDeviation, canOmitFetchingDataFromContract } =
      ContractFacade.getContractDataOpts(relayerConfig);

    if (canOmitFetchingDataFromContract) {
      const uniqueSignerThreshold = await this.getUniqueSignerThresholdMemoized();

      return {
        blockTag: 0,
        uniqueSignerThreshold,
        dataFromContract: {},
      };
    }

    const blockTag = await this.getBlockNumber();
    const [uniqueSignerThreshold, dataFromContract] = await Promise.all([
      this.getUniqueSignerThresholdMemoized(blockTag),
      this.getContractDataByBlock(dataFeeds, blockTag, shouldCheckValueDeviation),
    ]);

    return { blockTag, uniqueSignerThreshold, dataFromContract };
  }

  protected async getContractDataByBlock(
    feedIds: string[],
    blockTag: number,
    withDataFeedValues: boolean
  ) {
    const sortedUniqueFeedIds = [...new Set(feedIds)].sort();
    const cacheKey = `${blockTag}-${withDataFeedValues}-${sortedUniqueFeedIds.join(",")}`;
    const cached = this.contractDataCache.get(cacheKey);
    if (RedstoneCommon.isDefined(cached)) {
      return cached;
    }

    const value = await this.adapter.readContractData(feedIds, blockTag, withDataFeedValues);
    this.contractDataCache.set(cacheKey, value);

    return value;
  }

  async getUniqueSignerThresholdFromContract(blockTag?: number) {
    return await this.adapter.getUniqueSignerThreshold(blockTag ?? (await this.getBlockNumber()));
  }

  async updatePrices(args: UpdatePricesArgs, options?: UpdatePricesOptions) {
    await this.adapter.writePricesFromPayloadToContract(
      this.getContractParamsProvider(args.updateRequestParams, args.dataFeedsToUpdate),
      options
    );
  }

  getContractParamsProvider(
    requestParams: DataPackagesRequestParams,
    feedIds?: string[]
  ): ContractParamsProvider {
    return new ContractParamsProvider(requestParams, this.cache, feedIds);
  }

  static getContractDataOpts(
    relayerConfig: Pick<
      RelayerConfig,
      "dataFeeds" | "updateConditions" | "updateTriggers" | "fallbackOffsetInMilliseconds"
    >
  ) {
    const { updateConditions, dataFeeds, updateTriggers, fallbackOffsetInMilliseconds } =
      relayerConfig;

    const shouldCheckValueDeviation = dataFeeds.some((feedId) =>
      updateConditions[feedId].includes("value-deviation")
    );
    const canOmitFetchingDataFromContract =
      !shouldCheckValueDeviation &&
      dataFeeds.every((feedId) => updateTriggers[feedId].timeSinceLastUpdateInMilliseconds === 0) &&
      !fallbackOffsetInMilliseconds;

    return { shouldCheckValueDeviation, canOmitFetchingDataFromContract };
  }
}

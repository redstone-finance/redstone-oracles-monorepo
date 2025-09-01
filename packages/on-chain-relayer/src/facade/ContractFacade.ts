import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  IContractConnector,
  IExtendedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import type { IRedstoneContractAdapter } from "../core/contract-interactions/IRedstoneContractAdapter";
import { makeDataPackagesRequestParams } from "../core/make-data-packages-request-params";
import { ContractData, ShouldUpdateContext, UpdatePricesArgs } from "../types";

export type UpdatePricesOptions = {
  canOmitFallbackAfterFailing?: boolean;
  allFeedIds: string[];
};

export abstract class ContractFacade {
  private readonly logger = loggerFactory("contract-facade");
  private readonly getUniqueSignerThresholdMemoized: (
    blockTag?: number
  ) => Promise<number>;

  constructor(
    protected readonly connector: IContractConnector<
      IExtendedPricesContractAdapter | IRedstoneContractAdapter
    >,
    opts: Pick<RelayerConfig, "uniqueSignerThresholdCacheTtlMs"> = {
      uniqueSignerThresholdCacheTtlMs: 0,
    },
    protected cache?: DataPackagesResponseCache
  ) {
    this.getUniqueSignerThresholdMemoized = RedstoneCommon.memoize({
      functionToMemoize: (blockTag?: number) =>
        this.getUniqueSignerThresholdFromContract(blockTag),
      ttl: opts.uniqueSignerThresholdCacheTtlMs,
      cacheReporter: (isMissing: boolean) =>
        isMissing
          ? this.logger.log("Refreshing cached uniqueSignerThreshold")
          : this.logger.info("Reusing cached uniqueSignerThreshold"),
      cacheKeyBuilder: () => "uniqueSignerThresholdCached",
    });
  }

  abstract getLatestRoundContractData(
    feedIds: string[],
    blockTag: number,
    withDataFeedValues: boolean
  ): Promise<ContractData>;

  async getShouldUpdateContext(
    relayerConfig: RelayerConfig
  ): Promise<ShouldUpdateContext> {
    const { blockTag, uniqueSignerThreshold, dataFromContract } =
      await this.getContractData(relayerConfig);

    const requestParams = makeDataPackagesRequestParams(
      relayerConfig,
      uniqueSignerThreshold
    );

    const dataPackages = await this.getContractParamsProvider(
      requestParams
    ).requestDataPackages(this.cache?.isEmpty());

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
    return this.connector.getBlockNumber();
  }

  private async getContractData(relayerConfig: RelayerConfig) {
    const { dataFeeds } = relayerConfig;
    const { shouldCheckValueDeviation, canOmitFetchingDataFromContract } =
      ContractFacade.getContractDataOpts(relayerConfig);

    if (canOmitFetchingDataFromContract) {
      const uniqueSignerThreshold =
        await this.getUniqueSignerThresholdMemoized();

      return {
        blockTag: 0,
        uniqueSignerThreshold,
        dataFromContract: {},
      };
    }

    const blockTag = await this.getBlockNumber();
    const [uniqueSignerThreshold, dataFromContract] = await Promise.all([
      this.getUniqueSignerThresholdMemoized(blockTag),
      this.getLatestRoundContractData(
        dataFeeds,
        blockTag,
        shouldCheckValueDeviation
      ),
    ]);

    return { blockTag, uniqueSignerThreshold, dataFromContract };
  }

  async getUniqueSignerThresholdFromContract(blockTag?: number) {
    return await (
      await this.connector.getAdapter()
    ).getUniqueSignerThreshold(blockTag ?? (await this.getBlockNumber()));
  }

  async updatePrices(
    args: UpdatePricesArgs,
    options?: UpdatePricesOptions
  ): Promise<void> {
    const adapter = await this.connector.getAdapter();

    const result = await adapter.writePricesFromPayloadToContract(
      this.getContractParamsProvider(
        args.updateRequestParams,
        args.dataFeedsToUpdate
      ),
      options
    );

    if (typeof result === "string") {
      // TODO: split it to wait and describe, also for evm connector
      this.connector
        .waitForTransaction(result)
        .then((_) => {})
        .catch((error) =>
          this.logger.error(RedstoneCommon.stringifyError(error))
        );
    }
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
      "dataFeeds" | "updateConditions" | "updateTriggers"
    >
  ) {
    const { updateConditions, dataFeeds, updateTriggers } = relayerConfig;

    const shouldCheckValueDeviation = dataFeeds.some((feedId) =>
      updateConditions[feedId].includes("value-deviation")
    );
    const canOmitFetchingDataFromContract =
      !shouldCheckValueDeviation &&
      dataFeeds.every(
        (feedId) =>
          updateTriggers[feedId].timeSinceLastUpdateInMilliseconds === 0
      );

    return { shouldCheckValueDeviation, canOmitFetchingDataFromContract };
  }
}

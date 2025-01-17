import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  IContractConnector,
  IExtendedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";
import { IRedstoneContractAdapter } from "../core/contract-interactions/IRedstoneContractAdapter";
import { makeDataPackagesRequestParams } from "../core/make-data-packages-request-params";
import { ContractData, ShouldUpdateContext, UpdatePricesArgs } from "../types";

export abstract class ContractFacade {
  private readonly logger = loggerFactory("contract-facade");

  constructor(
    protected readonly connector: IContractConnector<
      IExtendedPricesContractAdapter | IRedstoneContractAdapter
    >,
    protected cache?: DataPackagesResponseCache
  ) {}

  abstract getLatestRoundContractData(
    feedIds: string[],
    blockTag: number,
    withDataFeedValues: boolean
  ): Promise<ContractData>;

  async getShouldUpdateContext(
    relayerConfig: RelayerConfig
  ): Promise<ShouldUpdateContext> {
    const blockTag = await this.getBlockNumber();
    const { updateConditions, dataFeeds } = relayerConfig;
    const shouldCheckValueDeviation = dataFeeds.some((feedId) =>
      updateConditions[feedId].includes("value-deviation")
    );

    const [uniqueSignersThreshold, dataFromContract] = await Promise.all([
      this.getUniqueSignersThresholdFromContract(blockTag),
      this.getLatestRoundContractData(
        dataFeeds,
        blockTag,
        shouldCheckValueDeviation
      ),
    ]);

    const requestParams = makeDataPackagesRequestParams(
      relayerConfig,
      uniqueSignersThreshold
    );

    const dataPackages = await this.getContractParamsProvider(
      requestParams
    ).requestDataPackages(this.cache?.isEmpty());

    return {
      dataPackages,
      uniqueSignersThreshold,
      dataFromContract,
      blockTag,
      baseChecksTimestamp: Date.now(),
      historicalCache: new DataPackagesResponseCache(),
    };
  }

  getBlockNumber() {
    return this.connector.getBlockNumber();
  }

  async getUniqueSignersThresholdFromContract(
    blockTag: number
  ): Promise<number> {
    return await (
      await this.connector.getAdapter()
    ).getUniqueSignerThreshold(blockTag);
  }

  async updatePrices(args: UpdatePricesArgs): Promise<void> {
    const adapter = await this.connector.getAdapter();

    const result = await adapter.writePricesFromPayloadToContract(
      this.getContractParamsProvider(
        args.updateRequestParams,
        args.dataFeedsToUpdate
      )
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
}

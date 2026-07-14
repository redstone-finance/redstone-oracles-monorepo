import { ContractParamsProvider, DataPackagesRequestParams } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ContractUpdateContext, ContractUpdater } from "./ContractUpdater";
import { TxDeliveryMan, TxDeliveryManConfig } from "./TxDeliveryMan";

const DEFAULT_MAX_PARALLEL_TX_COUNT = 100;

export type MultiTxDeliveryManConfig = {
  batchSizePerRequestParams: (requestParams: DataPackagesRequestParams) => number;
  maxParallelTxCount?: number;
};

export class MultiTxDeliveryMan extends TxDeliveryMan {
  constructor(
    private readonly multiConfig: TxDeliveryManConfig & MultiTxDeliveryManConfig,
    logTarget: string = "multi-tx-delivery-man"
  ) {
    super(multiConfig, logTarget);
  }

  override async updateContract(
    updater: ContractUpdater,
    multiParamsProvider: ContractParamsProvider,
    context: ContractUpdateContext = { updateStartTimeMs: Date.now() }
  ) {
    const paramsProviders = multiParamsProvider.splitIntoFeedBatches(
      this.multiConfig.batchSizePerRequestParams(multiParamsProvider.requestParams)
    );
    if (paramsProviders.length === 1) {
      return await this.deliverBatch(updater, multiParamsProvider, context);
    }

    const executors = paramsProviders.map(
      (paramsProvider) => async () => await this.deliverBatch(updater, paramsProvider, context)
    );

    const results = await RedstoneCommon.batchPromises(
      this.multiConfig.maxParallelTxCount ?? DEFAULT_MAX_PARALLEL_TX_COUNT,
      0,
      executors,
      true
    );

    return results.at(-1)!;
  }

  protected async deliverBatch(
    updater: ContractUpdater,
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ) {
    return await new TxDeliveryMan(
      this.multiConfig,
      `tx-delivery-man-${paramsProvider.getDataFeedIds().join("-")}`
    ).updateContract(updater, paramsProvider, context);
  }
}

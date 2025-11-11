import { ContractParamsProvider, DataPackagesRequestParams } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ContractUpdater } from "./ContractUpdater";
import { TxDeliveryMan, TxDeliveryManConfig, TxDeliveryManUpdateStatus } from "./TxDeliveryMan";

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
    multiParamsProvider: ContractParamsProvider
  ): Promise<TxDeliveryManUpdateStatus> {
    const paramsProviders = multiParamsProvider.splitIntoFeedBatches(
      this.multiConfig.batchSizePerRequestParams(multiParamsProvider.requestParams)
    );
    if (paramsProviders.length === 1) {
      return await super.updateContract(updater, multiParamsProvider);
    }

    const executors = paramsProviders.map(
      (paramsProvider) => async () =>
        await new TxDeliveryMan(
          this.multiConfig,
          `tx-delivery-man-${paramsProvider.getDataFeedIds().join("-")}`
        ).updateContract(updater, paramsProvider)
    );

    const results = await RedstoneCommon.batchPromises(
      this.multiConfig.maxParallelTxCount ?? DEFAULT_MAX_PARALLEL_TX_COUNT,
      0,
      executors,
      true
    );

    return results.at(-1)!;
  }
}

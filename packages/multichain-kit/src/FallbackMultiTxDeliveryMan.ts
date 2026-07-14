import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { ContractUpdateContext, ContractUpdater } from "./ContractUpdater";
import { MultiTxDeliveryMan, MultiTxDeliveryManConfig } from "./MultiTxDeliveryMan";
import { TxDeliveryManConfig, TxDeliveryManUpdateStatus } from "./TxDeliveryMan";

export interface FallbackUpdater {
  writePrices(
    paramsProvider: ContractParamsProvider,
    context?: ContractUpdateContext
  ): Promise<TxDeliveryManUpdateStatus>;
}

export class FallbackMultiTxDeliveryMan extends MultiTxDeliveryMan {
  constructor(
    multiConfig: TxDeliveryManConfig & MultiTxDeliveryManConfig,
    private readonly fallbackUpdater: FallbackUpdater,
    logTarget?: string
  ) {
    super(multiConfig, logTarget);
  }

  protected override async deliverBatch(
    updater: ContractUpdater,
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ) {
    const viaPrimary = await super.deliverBatch(updater, paramsProvider, context);
    if (FP.isOk(viaPrimary)) {
      return viaPrimary;
    }

    this.logger.warn(
      `Primary delivery failed for feeds ${paramsProvider.getDataFeedIds().join(", ")}, falling back`
    );

    return await this.fallbackUpdater.writePrices(paramsProvider, context);
  }
}

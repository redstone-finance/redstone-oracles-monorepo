import { TxDeliveryMan, TxDeliveryManConfig } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { CantonContractUpdater, CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export class CantonTxDeliveryMan extends TxDeliveryMan<CantonTxResultExt> {
  constructor(
    config: TxDeliveryManConfig,
    private readonly trafficMeter: CantonTrafficMeter
  ) {
    super(config);
  }

  override async updateContract(
    updater: CantonContractUpdater,
    paramsProvider: ContractParamsProvider
  ) {
    const feedCount = paramsProvider.getDataFeedIds().length;

    this.trafficMeter.beforeUpdate();
    const result = await super.updateContract(updater, paramsProvider);
    void this.trafficMeter.afterUpdate(feedCount, result);

    return result;
  }
}

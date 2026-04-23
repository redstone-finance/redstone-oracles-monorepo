import { TxDeliveryMan, TxDeliveryManConfig } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { CantonContractUpdater, CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export class CantonTxDeliveryMan extends TxDeliveryMan<CantonTxResultExt> {
  constructor(
    config: TxDeliveryManConfig,
    private readonly trafficMeter: CantonTrafficMeter,
    private readonly fetchTotalConsumedTraffic: () => Promise<number>
  ) {
    super(config);
  }

  override async updateContract(
    updater: CantonContractUpdater,
    paramsProvider: ContractParamsProvider
  ) {
    let initialTraffic: number | undefined;
    void this.getTotalConsumedTrafficSafe().then((value) => (initialTraffic = value));

    const result = await super.updateContract(updater, paramsProvider);

    void this.getTotalConsumedTrafficSafe().then((totalConsumed) => {
      this.trafficMeter.register(initialTraffic, totalConsumed, {
        ...FP.unwrapOr(result, undefined)?.metadata,
        feedCount: paramsProvider.getDataFeedIds().length,
      });
    });

    return result;
  }

  private async getTotalConsumedTrafficSafe() {
    try {
      return await this.fetchTotalConsumedTraffic();
    } catch (e) {
      this.logger.warn(
        `Failed to fetch total consumed traffic: ${RedstoneCommon.stringifyError(e)}`
      );
      return undefined;
    }
  }
}

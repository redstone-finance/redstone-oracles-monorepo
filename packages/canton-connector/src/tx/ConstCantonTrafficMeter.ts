import { TxDeliveryManUpdateStatus } from "@redstone-finance/multichain-kit";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export const DAILY_TRAFFIC_BUDGET_BYTES = 14.4 * 1_000_000;
export const ONE_DAY_MS = RedstoneCommon.daysToMs(1);

export class ConstCantonTrafficMeter extends CantonTrafficMeter {
  private lastSendTimeMs?: number;

  constructor(
    shouldAccumulateTraffic: boolean,
    private readonly totalFeedCount: number
  ) {
    super(shouldAccumulateTraffic);
  }

  override beforeUpdate() {}

  override refund() {}

  override afterUpdate(feedCount: number, result: TxDeliveryManUpdateStatus<CantonTxResultExt>) {
    const now = Date.now();
    if (RedstoneCommon.isDefined(this.lastSendTimeMs)) {
      const elapsedMs = now - this.lastSendTimeMs;

      this.addPaidTrafficCost(
        (DAILY_TRAFFIC_BUDGET_BYTES * elapsedMs * feedCount) / (ONE_DAY_MS * this.totalFeedCount)
      );
    }
    this.lastSendTimeMs = now;

    const metadata = FP.unwrapOr(result, undefined)?.metadata;
    if (metadata) {
      CantonTrafficMeter.logger.info(
        `Traffic used: const meter; metadata paidTrafficCost: ${metadata.paidTrafficCost}`,
        { metadata }
      );
    }
  }
}

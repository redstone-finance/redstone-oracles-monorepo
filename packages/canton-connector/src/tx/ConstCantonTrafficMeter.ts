import { TxDeliveryManUpdateStatus } from "@redstone-finance/multichain-kit";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export const DAILY_TRAFFIC_BUDGET_BYTES = 14.4 * 1_000_000;
export const ONE_DAY_MS = RedstoneCommon.daysToMs(1);
export const MAX_ELAPSED_MS = RedstoneCommon.hourToMs(1);

export class ConstCantonTrafficMeter extends CantonTrafficMeter {
  private readonly lastSendTimeMs = new Map<string, number>();

  constructor(
    shouldAccumulateTraffic: boolean,
    private readonly totalFeedCount: number
  ) {
    super(shouldAccumulateTraffic);
  }

  override beforeUpdate() {}

  override refund() {}

  override afterUpdate(feedIds: string[], result: TxDeliveryManUpdateStatus<CantonTxResultExt>) {
    const now = Date.now();
    const elapsedMsSum = _.sum(feedIds.map((feedId) => this.cappedElapsedMs(feedId, now)));
    feedIds.forEach((feedId) => this.lastSendTimeMs.set(feedId, now));

    this.addPaidTrafficCost(
      (DAILY_TRAFFIC_BUDGET_BYTES * elapsedMsSum) / (ONE_DAY_MS * this.totalFeedCount)
    );

    const metadata = FP.unwrapOr(result, undefined)?.metadata;
    if (metadata) {
      CantonTrafficMeter.logger.info(
        `Traffic used: const meter; metadata paidTrafficCost: ${metadata.paidTrafficCost}`,
        { metadata }
      );
    }
  }

  private cappedElapsedMs(feedId: string, now: number) {
    const lastSendTimeMs = this.lastSendTimeMs.get(feedId);
    if (!RedstoneCommon.isDefined(lastSendTimeMs)) {
      return 0;
    }

    return Math.min(now - lastSendTimeMs, MAX_ELAPSED_MS);
  }
}

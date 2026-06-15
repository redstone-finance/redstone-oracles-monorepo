import { TxDeliveryManUpdateStatus } from "@redstone-finance/multichain-kit";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { TransactionMetadata } from "../client/CantonClient";
import { CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export class RealCantonTrafficMeter extends CantonTrafficMeter {
  private initialConsumedTrafficPromise?: Promise<number | undefined>;
  private lastRegisteredConsumed?: number;

  constructor(
    shouldAccumulateTraffic: boolean,
    private readonly fetchTotalConsumedTraffic: () => Promise<number>
  ) {
    super(shouldAccumulateTraffic);
  }

  override beforeUpdate() {
    this.initialConsumedTrafficPromise = this.getTotalConsumedTrafficSafe();
  }

  override afterUpdate(feedIds: string[], result: TxDeliveryManUpdateStatus<CantonTxResultExt>) {
    const metadata = FP.unwrapOr(result, undefined)?.metadata;
    const initialPromise = this.initialConsumedTrafficPromise ?? Promise.resolve(undefined);

    return Promise.all([initialPromise, this.getTotalConsumedTrafficSafe()]).then(
      ([initial, totalConsumed]) => {
        if (RedstoneCommon.isDefined(initial) && RedstoneCommon.isDefined(totalConsumed)) {
          this.registerMeasured(initial, totalConsumed, metadata);
        } else {
          CantonTrafficMeter.logger.warn(
            `Traffic used: measurement incomplete, using metadata paidTrafficCost: ${metadata?.paidTrafficCost}`,
            { feedCount: feedIds.length, initial, totalConsumed, metadata }
          );
          this.addPaidTrafficCost(metadata?.paidTrafficCost);
        }
      }
    );
  }

  registerMeasured(initial: number, totalConsumed: number, metadata?: TransactionMetadata) {
    const base =
      RedstoneCommon.isDefined(this.lastRegisteredConsumed) && initial < this.lastRegisteredConsumed
        ? this.lastRegisteredConsumed
        : initial;

    const usedTraffic = totalConsumed - base;

    CantonTrafficMeter.logger.info(
      `Traffic used: ${usedTraffic} bytes (initial: ${initial}, base: ${base}, total: ${totalConsumed})`,
      { usedTraffic, initial, base, totalConsumed, metadata }
    );

    this.lastRegisteredConsumed = totalConsumed;
    this.addPaidTrafficCost(usedTraffic);
  }

  private async getTotalConsumedTrafficSafe() {
    try {
      return await this.fetchTotalConsumedTraffic();
    } catch (e) {
      CantonTrafficMeter.logger.warn(
        `Failed to fetch total consumed traffic: ${RedstoneCommon.stringifyError(e)}`
      );

      return undefined;
    }
  }
}

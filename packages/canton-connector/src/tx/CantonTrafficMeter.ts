import { TxDeliveryManUpdateStatus } from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { CantonTxResultExt } from "./CantonContractUpdater";

export abstract class CantonTrafficMeter {
  protected static logger = loggerFactory("canton-traffic-meter");
  private accumulatedPaidTrafficCost?: number;
  protected static accumulatingInstance?: CantonTrafficMeter;

  constructor(private readonly shouldAccumulateTraffic: boolean) {
    if (!shouldAccumulateTraffic) {
      return;
    }

    if (CantonTrafficMeter.accumulatingInstance) {
      throw new Error(
        "Creating a new accumulating instance of CantonTrafficMeter may lead to unexpected behaviour and is not supported now for one validator"
      );
    }

    CantonTrafficMeter.accumulatingInstance = this;
  }

  abstract beforeUpdate(): void;

  abstract afterUpdate(
    feedCount: number,
    result: TxDeliveryManUpdateStatus<CantonTxResultExt>
  ): Promise<void> | void;

  consumeAccumulated() {
    const paidTrafficCost = Math.round(this.accumulatedPaidTrafficCost ?? 0);
    this.accumulatedPaidTrafficCost = 0;

    if (paidTrafficCost) {
      CantonTrafficMeter.logger.info(`Consuming accumulatedPaidTrafficCost: ${paidTrafficCost}`, {
        paidTrafficCost,
      });
    }

    return paidTrafficCost;
  }

  refund(paidTrafficCost: number) {
    this.addPaidTrafficCost(paidTrafficCost);
  }

  protected addPaidTrafficCost(paidTrafficCost?: number) {
    if (
      !this.shouldAccumulateTraffic ||
      !RedstoneCommon.isDefined(paidTrafficCost) ||
      paidTrafficCost < 0
    ) {
      return;
    }

    const rounded = Math.round(paidTrafficCost);
    CantonTrafficMeter.logger.info(`Used paidTrafficCost: ${rounded}`, {
      paidTrafficCost: rounded,
    });

    this.accumulatedPaidTrafficCost ??= 0;
    this.accumulatedPaidTrafficCost += paidTrafficCost;
  }
}

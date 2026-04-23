import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { TransactionMetadata } from "../client/CantonClient";

export class CantonTrafficMeter {
  private static logger = loggerFactory("canton-traffic-meter");
  private lastRegisteredConsumed?: number;
  private accumulatedPaidTrafficCost?: number;
  private static createdInstance?: CantonTrafficMeter;

  constructor(private readonly shouldAccumulateTraffic: boolean) {
    if (CantonTrafficMeter.createdInstance) {
      throw new Error(
        "Creating a new instance of CantonTrafficMeter may lead to unexpected behaviour and is not supported now for one validator"
      );
    }

    CantonTrafficMeter.createdInstance = this;
  }

  register(
    initial: number | undefined,
    totalConsumed: number | undefined,
    metadata?: TransactionMetadata & { feedCount?: number }
  ) {
    if (RedstoneCommon.isDefined(initial) && RedstoneCommon.isDefined(totalConsumed)) {
      const base =
        RedstoneCommon.isDefined(this.lastRegisteredConsumed) &&
        initial < this.lastRegisteredConsumed
          ? this.lastRegisteredConsumed
          : initial;

      const usedTraffic = totalConsumed - base;

      CantonTrafficMeter.logger.info(
        `Traffic used: ${usedTraffic} bytes (initial: ${initial}, base: ${base}, total: ${totalConsumed}); ` +
          `metadata paidTrafficCost: ${metadata?.paidTrafficCost}`,
        { usedTraffic, initial, base, totalConsumed, metadata }
      );

      this.lastRegisteredConsumed = totalConsumed;
      this.addPaidTrafficCost(usedTraffic);
    } else {
      CantonTrafficMeter.logger.warn(
        `Traffic measurement incomplete, using metadata paidTrafficCost: ${metadata?.paidTrafficCost}`,
        { metadata }
      );
      this.addPaidTrafficCost(metadata?.paidTrafficCost);
    }
  }

  consumeAccumulated() {
    const paidTrafficCost = this.accumulatedPaidTrafficCost;
    this.accumulatedPaidTrafficCost = 0;

    if (paidTrafficCost) {
      CantonTrafficMeter.logger.info(`Consuming accumulatedPaidTrafficCost: ${paidTrafficCost}`, {
        paidTrafficCost,
      });
    }

    return paidTrafficCost;
  }

  private addPaidTrafficCost(paidTrafficCost?: number) {
    if (
      !this.shouldAccumulateTraffic ||
      !RedstoneCommon.isDefined(paidTrafficCost) ||
      paidTrafficCost < 0
    ) {
      return;
    }

    CantonTrafficMeter.logger.info(`Used paidTrafficCost: ${paidTrafficCost}`, {
      paidTrafficCost,
    });

    this.accumulatedPaidTrafficCost ??= 0;
    this.accumulatedPaidTrafficCost += paidTrafficCost;
  }
}

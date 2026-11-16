import { TxDeliveryManUpdateStatus } from "@redstone-finance/multichain-kit";
import { FP, MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { TransactionMetadata } from "../client/CantonClient";
import { ConsumedRange, overlapLength } from "../utils/overlap-length";
import { CantonTxResultExt } from "./CantonContractUpdater";
import { CantonTrafficMeter } from "./CantonTrafficMeter";

export class RealCantonTrafficMeter extends CantonTrafficMeter {
  private initialConsumedTrafficPromise?: Promise<number | undefined>;
  private lastRegisteredConsumed?: number;
  private openMeasurementCount = 0;
  private registeredRanges: ConsumedRange[] = [];

  constructor(
    shouldAccumulateTraffic: boolean,
    private readonly fetchTotalConsumedTraffic: () => Promise<number>
  ) {
    super(shouldAccumulateTraffic);
  }

  override beforeUpdate() {
    this.openMeasurementCount++;
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
        this.closeMeasurement();
      }
    );
  }

  override async measureSpending(spend: () => Promise<number>) {
    this.openMeasurementCount++;
    try {
      const initial = await this.getTotalConsumedTrafficSafe();
      const paidTrafficCost = await spend();
      if (!paidTrafficCost) {
        return;
      }

      const totalConsumed = await this.getTotalConsumedTrafficSafe();
      if (RedstoneCommon.isDefined(initial) && RedstoneCommon.isDefined(totalConsumed)) {
        this.registerMeasured(initial, totalConsumed);
      } else {
        this.addPaidTrafficCost(paidTrafficCost);
      }
    } finally {
      this.closeMeasurement();
    }
  }

  registerMeasured(initial: number, totalConsumed: number, metadata?: TransactionMetadata) {
    const base =
      RedstoneCommon.isDefined(this.lastRegisteredConsumed) && initial < this.lastRegisteredConsumed
        ? this.lastRegisteredConsumed
        : initial;
    const range = { from: base, to: totalConsumed };
    const alreadyCounted = MathUtils.sumBy(this.registeredRanges, (registered) =>
      overlapLength(registered, range)
    );

    const usedTraffic = totalConsumed - base - alreadyCounted;

    CantonTrafficMeter.logger.info(
      `Traffic used: ${usedTraffic} bytes (initial: ${initial}, base: ${base}, already counted: ${alreadyCounted}, total: ${totalConsumed})`,
      { usedTraffic, initial, base, alreadyCounted, totalConsumed, metadata }
    );

    this.addRegisteredRange(range);
    this.addPaidTrafficCost(usedTraffic);
    this.foldRangesWhenIdle();
  }

  private closeMeasurement() {
    this.openMeasurementCount--;
    this.foldRangesWhenIdle();
  }

  private addRegisteredRange(range: ConsumedRange) {
    if (range.to <= range.from) {
      return;
    }

    const [overlapping, separate] = _.partition(
      this.registeredRanges,
      (registered) => overlapLength(registered, range) > 0
    );
    this.registeredRanges = [
      ...separate,
      {
        from: Math.min(range.from, ...overlapping.map(({ from }) => from)),
        to: Math.max(range.to, ...overlapping.map(({ to }) => to)),
      },
    ];
  }

  private foldRangesWhenIdle() {
    if (this.openMeasurementCount > 0 || !this.registeredRanges.length) {
      return;
    }

    this.lastRegisteredConsumed = Math.max(...this.registeredRanges.map(({ to }) => to));
    this.registeredRanges = [];
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

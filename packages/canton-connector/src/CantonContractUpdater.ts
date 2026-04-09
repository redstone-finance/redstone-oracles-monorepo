import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, isInfoEnabled, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { ActiveContractData } from "./utils";

export interface CantonChoiceExerciser {
  exerciseWriteChoice<Res, Arg extends object>(actAs: string, argument: Arg): Promise<Res>;
  onError(): void;
  getRemainingTraffic(): Promise<number>;
}

export class CantonContractUpdater implements ContractUpdater {
  private static logger = loggerFactory("canton-contract-updater");

  constructor(
    private readonly exerciser: CantonChoiceExerciser,
    private readonly actAs: string
  ) {}

  getSignerAddress() {
    return this.actAs;
  }

  async update(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ): Promise<ContractUpdateStatus> {
    const txResult = await FP.tryCallAsyncStringifyError(async () => {
      return await this.executeTransaction(paramsProvider, context);
    });

    if (FP.isErr(txResult)) {
      this.exerciser.onError();
    }

    return FP.mapStringifyError(txResult, (result) => ({
      transactionHash: typeof result === "string" ? result : result.contractId,
    }));
  }

  private async executeTransaction(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ) {
    let initialTraffic: number | undefined;
    this.getRemainingTrafficForLog()
      .then((value) => (initialTraffic = value))
      .catch(() => {});

    const payloadHex = await paramsProvider.getPayloadHex(false, {
      withUnsignedMetadata: true,
      metadataTimestamp: context.updateStartTimeMs,
      componentName: "canton-connector",
    });

    const startTime = Date.now();
    const feedIds = paramsProvider.getArrayifiedFeedIds();
    const result = await this.exerciser.exerciseWriteChoice<ActiveContractData | string, object>(
      this.actAs,
      { feedIds: feedIds, payloadHex }
    );

    this.logMetadata(feedIds.length, startTime, initialTraffic).catch((e) =>
      CantonContractUpdater.logger.warn(`Failed to logMetadata ${RedstoneCommon.stringifyError(e)}`)
    );

    return result;
  }

  private static shouldLogTraffic() {
    return isInfoEnabled();
  }

  private async logMetadata(feedCount: number, startTime: number, initialTraffic?: number) {
    const KB_IN_MB = 1024;
    const DIGITS = 3;

    const remainingTraffic = await this.getRemainingTrafficForLog();
    const usedTraffic =
      RedstoneCommon.isDefined(initialTraffic) && RedstoneCommon.isDefined(remainingTraffic)
        ? initialTraffic - remainingTraffic
        : undefined;

    const duration = Date.now() - startTime;

    CantonContractUpdater.logger.info(
      `exerciseWriteChoice of ${feedCount} feed${RedstoneCommon.getS(feedCount)} took ${duration} [ms]; ` +
        `trafficCost: ${usedTraffic} bytes (${remainingTraffic ? (remainingTraffic / KB_IN_MB).toFixed(DIGITS) : remainingTraffic} kB remaining)`,
      { duration, usedTraffic, feedCount, remainingTraffic }
    );
  }

  private async getRemainingTrafficForLog() {
    if (!CantonContractUpdater.shouldLogTraffic()) {
      return;
    }

    try {
      return await this.exerciser.getRemainingTraffic();
    } catch (e) {
      CantonContractUpdater.logger.warn(
        `Failed to fetch remaining traffic: ${RedstoneCommon.stringifyError(e)}`
      );

      return undefined;
    }
  }
}

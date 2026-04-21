import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { TransactionMetadata } from "../CantonClient";
import { ActiveContractData } from "../utils";

export interface CantonChoiceExerciser {
  exerciseWritePricesChoice(
    actAs: string,
    argument: object
  ): Promise<{ result: ActiveContractData | string; metadata: TransactionMetadata }>;
  onError(): void;
  addPaidTrafficCost(paidTrafficCost?: number): void;
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
    this.getRemainingTraffic()
      .then((value) => (initialTraffic = value))
      .catch(() => {});

    const payloadHex = await paramsProvider.getPayloadHex(false, {
      withUnsignedMetadata: true,
      metadataTimestamp: context.updateStartTimeMs,
      componentName: "canton-connector",
    });

    const startTime = Date.now();
    const feedIds = paramsProvider.getArrayifiedFeedIds();
    const { result, metadata } = await this.exerciser.exerciseWritePricesChoice(this.actAs, {
      feedIds: feedIds,
      payloadHex,
    });

    this.checkTraffic(feedIds.length, startTime, metadata, initialTraffic)
      .then(this.exerciser.addPaidTrafficCost.bind(this.exerciser))
      .catch((e) =>
        CantonContractUpdater.logger.warn(
          `Failed to checkTraffic ${RedstoneCommon.stringifyError(e)}`
        )
      );

    return result;
  }

  private async checkTraffic(
    feedCount: number,
    startTime: number,
    metadata: TransactionMetadata,
    initialTraffic?: number
  ) {
    const KB_IN_MB = 1024;
    const DIGITS = 3;

    const remainingTraffic = await this.getRemainingTraffic();
    const usedTraffic =
      RedstoneCommon.isDefined(initialTraffic) && RedstoneCommon.isDefined(remainingTraffic)
        ? initialTraffic - remainingTraffic
        : undefined;

    const duration = Date.now() - startTime;

    CantonContractUpdater.logger.info(
      `exerciseWriteChoice of ${feedCount} feed${RedstoneCommon.getS(feedCount)} took ${duration} [ms]; ` +
        `trafficCost: ${usedTraffic} bytes (${remainingTraffic ? (remainingTraffic / KB_IN_MB).toFixed(DIGITS) : remainingTraffic} kB remaining); ` +
        `metadata paidTrafficCost: ${metadata.paidTrafficCost}`,
      {
        duration,
        usedTraffic,
        feedCount,
        remainingTraffic,
        metadata,
      }
    );

    return usedTraffic;
  }

  private async getRemainingTraffic() {
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

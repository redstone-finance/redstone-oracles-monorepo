import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
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
    const [payloadHexSettled, balanceSettled] = await Promise.allSettled([
      paramsProvider.getPayloadHex(false, {
        withUnsignedMetadata: true,
        metadataTimestamp: context.updateStartTimeMs,
        componentName: "canton-connector",
      }),
      this.exerciser.getRemainingTraffic(),
    ]);

    if (payloadHexSettled.status === "rejected") {
      throw new Error(RedstoneCommon.stringifyError(payloadHexSettled.reason));
    }

    const balance = balanceSettled.status === "rejected" ? undefined : balanceSettled.value;

    const startTime = Date.now();
    const feedIds = paramsProvider.getArrayifiedFeedIds();
    const result = await this.exerciser.exerciseWriteChoice<ActiveContractData | string, object>(
      this.actAs,
      { feedIds: feedIds, payloadHex: payloadHexSettled.value }
    );

    let newBalance: number | undefined;
    try {
      newBalance = await this.exerciser.getRemainingTraffic();
    } catch (e) {
      CantonContractUpdater.logger.warn(
        `Failed to fetch remaining traffic: ${RedstoneCommon.stringifyError(e)}`
      );
    } finally {
      const usedBalance =
        RedstoneCommon.isDefined(balance) && RedstoneCommon.isDefined(newBalance)
          ? balance - newBalance
          : undefined;

      const duration = Date.now() - startTime;
      CantonContractUpdater.logger.info(
        `exerciseWriteChoice of ${feedIds.length} feed${RedstoneCommon.getS(feedIds.length)} took ${duration} [ms]; trafficCost: ${usedBalance} bytes`,
        { duration, usedBalance, feedCount: feedIds.length }
      );
    }

    return result;
  }

  getSignerAddress() {
    return this.actAs;
  }
}

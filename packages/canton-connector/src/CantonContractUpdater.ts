import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { ActiveContractData } from "./utils";

export interface CantonChoiceExerciser {
  exerciseWriteChoice<Res, Arg extends object>(actAs: string, argument: Arg): Promise<Res>;
  onError(): void;
}

export class CantonContractUpdater implements ContractUpdater {
  constructor(
    private readonly exerciser: CantonChoiceExerciser,
    private readonly actAs: string
  ) {}

  async update(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ): Promise<ContractUpdateStatus> {
    const txResult = await FP.tryCallAsyncStringifyError(
      async () =>
        await this.exerciser.exerciseWriteChoice<ActiveContractData | string, object>(
          this.actAs,
          await CantonContractUpdater.getPayloadArguments(paramsProvider, context)
        )
    );

    if (FP.isErr(txResult)) {
      this.exerciser.onError();
    }

    return FP.mapStringifyError(txResult, (result) => ({
      transactionHash: typeof result === "string" ? result : result.contractId,
    }));
  }

  static async getPayloadArguments(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ) {
    return {
      feedIds: paramsProvider.getArrayifiedFeedIds(),
      payloadHex: await paramsProvider.getPayloadHex(false, {
        withUnsignedMetadata: true,
        metadataTimestamp: context.updateStartTimeMs,
        componentName: "canton-connector",
      }),
    };
  }

  getSignerAddress() {
    return this.actAs;
  }
}

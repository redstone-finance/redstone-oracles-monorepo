import {
  ContractUpdateContext,
  ContractUpdater,
  ContractUpdateStatus,
} from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { TransactionMetadata } from "../client/CantonClient";
import { ActiveContractData } from "../utils/utils";

export type CantonTxResultExt = { metadata: TransactionMetadata };

export interface CantonChoiceExerciser {
  exerciseWritePricesChoice(
    actAs: string,
    argument: object
  ): Promise<{ result: ActiveContractData | string } & CantonTxResultExt>;
  onError(): void;
}

export class CantonContractUpdater implements ContractUpdater<CantonTxResultExt> {
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
  ): Promise<ContractUpdateStatus<CantonTxResultExt>> {
    const txResult = await FP.tryCallAsyncStringifyError(async () => {
      return await this.executeTransaction(paramsProvider, context);
    });

    if (FP.isErr(txResult)) {
      this.exerciser.onError();
    }

    return FP.mapStringifyError(txResult, (result) => ({
      transactionHash: typeof result.result === "string" ? result.result : result.result.contractId,
      metadata: result.metadata,
    }));
  }

  private async executeTransaction(
    paramsProvider: ContractParamsProvider,
    context: ContractUpdateContext
  ) {
    const payloadHex = await paramsProvider.getPayloadHex(false, {
      withUnsignedMetadata: true,
      metadataTimestamp: context.updateStartTimeMs,
      componentName: "canton-connector",
    });

    const feedIds = paramsProvider.getArrayifiedFeedIds();
    return await this.exerciser.exerciseWritePricesChoice(this.actAs, {
      feedIds,
      payloadHex,
    });
  }
}

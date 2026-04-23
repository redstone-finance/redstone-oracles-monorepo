import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";

export type ContractUpdateStatus<T = unknown> = FP.Result<{ transactionHash: string } & T, string>;
export type ContractUpdateContext = {
  updateStartTimeMs: number;
};

export interface ContractUpdater<
  TxResultExt = unknown,
  Context extends ContractUpdateContext = ContractUpdateContext,
> {
  update(
    paramsProvider: ContractParamsProvider,
    context: Context,
    attempt: number
  ): Promise<ContractUpdateStatus<TxResultExt>>;
}

import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";

export type ContractUpdateStatus = FP.Result<{ transactionHash: string }, string>;
export type ContractUpdateContext = {
  updateStartTimeMs: number;
};

export interface ContractUpdater<Context extends ContractUpdateContext = ContractUpdateContext> {
  update(
    paramsProvider: ContractParamsProvider,
    context: Context,
    attempt: number
  ): Promise<ContractUpdateStatus>;
}

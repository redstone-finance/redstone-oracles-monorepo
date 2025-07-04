import { ContractParamsProvider } from "@redstone-finance/sdk";
import { UpdatePricesOptions } from "../../facade/ContractFacade";
import { ContractData } from "../../types";

export interface IRedstoneContractAdapter {
  getUniqueSignerThreshold(blockNumber?: number): Promise<number>;

  readLatestRoundContractData(
    feedIds: string[],
    blockNumber: number,
    withDataFeedValues: boolean
  ): Promise<ContractData>;

  writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): Promise<unknown>;

  getSignerAddress(): Promise<string | undefined>;
}

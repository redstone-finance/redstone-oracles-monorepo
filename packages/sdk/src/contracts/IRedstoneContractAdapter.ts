import { ContractData } from "./ContractData";
import { ContractParamsProvider } from "./ContractParamsProvider";
import { UpdatePricesOptions } from "./UpdatePricesOptions";

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

  getDataFeedIds?: (blockNumber: number) => Promise<string[] | undefined>;

  readContractData(
    feedIds: string[],
    blockNumber: number,
    withDataFeedValues: boolean
  ): Promise<ContractData>;
}

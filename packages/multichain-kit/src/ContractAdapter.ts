import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";

export interface ContractAdapter {
  readContractData(
    feedIds: string[],
    blockNumber?: number,
    withDataFeedValues?: boolean
  ): Promise<ContractData>;
  getDataFeedIds?(blockNumber?: number): Promise<string[] | undefined>;
  readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    blockNumber?: number
  ): Promise<bigint[]>;
  readTimestampFromContract(feedId?: string, blockNumber?: number): Promise<number>;
  readLatestUpdateBlockTimestamp(
    feedId?: string,
    blockNumber?: number
  ): Promise<number | undefined>;
}

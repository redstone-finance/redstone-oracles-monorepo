import { ContractData } from "@redstone-finance/sdk";

export interface ContractAdapter {
  readContractData(
    feedIds: string[],
    blockNumber?: number,
    withDataFeedValues?: boolean
  ): Promise<ContractData>;
  getDataFeedIds?(blockNumber?: number): Promise<string[] | undefined>;

  getLatestRoundIds?(
    feedIds: string[],
    numberOfRounds: number,
    blockNumber?: number
  ): Promise<(bigint[] | undefined)[]>;
  getValueForDataFeedAndRound?(feedId: string, roundId: bigint, blockTag?: number): Promise<bigint>;
}

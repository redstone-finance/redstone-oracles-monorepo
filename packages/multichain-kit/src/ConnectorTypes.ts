import { ContractData, ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";

export interface BlockchainService {
  getBlockNumber(): Promise<number>;

  waitForTransaction(txId: string): Promise<boolean>;

  getNormalizedBalance(address: string, blockNumber?: number): Promise<bigint>;

  getBalance(addressOrName: string, blockTag?: number): Promise<bigint>;

  getInstanceTtl?: (address: string) => Promise<Date | undefined>;
}

export interface ContractAdapter {
  readContractData(feedIds: string[], blockNumber?: number): Promise<ContractData>;

  getUniqueSignerThreshold(blockNumber?: number): Promise<number>;

  getDataFeedIds?(blockNumber?: number): Promise<string[] | undefined>;

  getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]>;

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

export interface WriteContractAdapter extends ContractAdapter {
  writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): Promise<string>;

  getSignerAddress(): Promise<string>;
}

export interface BlockchainServiceWithTransfer extends BlockchainService {
  transfer(toAddress: string, amount: number): Promise<void>;
  getSignerAddress(): Promise<string>;
}

export interface FullConnector extends WriteContractAdapter, BlockchainService {}

import { ContractData, ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";

export interface LegacyIPricesContractAdapter {
  // Reads on-chain the returned by paramsProvider RedStone payload data and returns aggregated price values
  // for the feeds passed through the paramsProvider. It doesn't modify the contract's storage.
  getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]>;

  // Reads on-chain the returned by paramsProvider RedStone payload data and writes aggregated price values
  // for the feeds passed through the paramsProvider to the contract's storage.
  writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): Promise<string | bigint[]>;

  // Reads the lastly written to the contract's storage aggregated price values for the feeds passed through the
  // paramsProvider. It doesn't modify the contract's storage and also doesn't take the RedStone payload as an argument
  readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    blockNumber?: number
  ): Promise<bigint[]>;

  // Reads the timestamp of the lastly written values to the contract's storage.
  // It doesn't modify the contract's storage
  readTimestampFromContract(feedId?: string, blockNumber?: number): Promise<number>;
}

export interface LegacyPricesContractAdapter extends LegacyIPricesContractAdapter {
  // Returns the unique signer threshold, which the contract is set up.
  getUniqueSignerThreshold(blockNumber?: number): Promise<number>;

  // Returns the block timestamp of the lastly written values to the contract's storage.
  readLatestUpdateBlockTimestamp(
    feedId?: string,
    blockNumber?: number
  ): Promise<number | undefined>;

  getSignerAddress(): Promise<string | undefined>;

  getDataFeedIds?: (blockTag?: number) => Promise<string[] | undefined>;

  readContractData(
    feedIds: string[],
    blockNumber?: number,
    withDataFeedValues?: boolean
  ): Promise<ContractData>;
}

export interface LegacyIContractConnector<Adapter> {
  getAdapter(): Promise<Adapter>;

  getBlockNumber(): Promise<number>;

  waitForTransaction(txId: string): Promise<boolean>;

  /// Normalized to a number for which 1 XYZ means 1e18
  /// In some monitoring mechanisms we assume the currency is denominated to 10 ** 18 units
  getNormalizedBalance?: (address: string, blockNumber?: number) => Promise<bigint>;

  transfer?: (toAddress: string, amount: number) => Promise<void>;

  getSignerAddress?: () => Promise<string>;
}

export interface LegacyIRedstoneContractAdapter {
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

export interface LegacyIRedstoneContractAdapterWithBlockNumber
  extends LegacyIRedstoneContractAdapter {
  getBlockNumber(): Promise<number>;
}

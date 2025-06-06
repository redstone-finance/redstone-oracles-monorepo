import { BigNumberish } from "ethers";
import { ContractData } from "../ContractData";
import { ContractParamsProvider } from "../ContractParamsProvider";

export interface IPricesContractAdapter {
  // Reads on-chain the returned by paramsProvider RedStone payload data and returns aggregated price values
  // for the feeds passed through the paramsProvider. It doesn't modify the contract's storage.
  getPricesFromPayload(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]>;

  // Reads on-chain the returned by paramsProvider RedStone payload data and writes aggregated price values
  // for the feeds passed through the paramsProvider to the contract's storage.
  writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string | BigNumberish[]>;

  // Reads the lastly written to the contract's storage aggregated price values for the feeds passed through the
  // paramsProvider. It doesn't modify the contract's storage and also doesn't take the RedStone payload as an argument
  readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    blockNumber?: number
  ): Promise<BigNumberish[]>;

  // Reads the timestamp of the lastly written values to the contract's storage.
  // It doesn't modify the contract's storage
  readTimestampFromContract(
    feedId?: string,
    blockNumber?: number
  ): Promise<number>;
}

export interface IExtendedPricesContractAdapter extends IPricesContractAdapter {
  // Returns the unique signer threshold, which the contract is set up.
  getUniqueSignerThreshold(blockNumber?: number): Promise<number>;

  // Returns the block timestamp of the lastly written values to the contract's storage.
  readLatestUpdateBlockTimestamp(
    feedId?: string,
    blockNumber?: number
  ): Promise<number | undefined>;

  getSignerAddress(): Promise<string | undefined>;
}

export interface IMultiFeedPricesContractAdapter
  extends IExtendedPricesContractAdapter {
  readContractData(
    feedIds: string[],
    blockNumber?: number
  ): Promise<ContractData>;
}

import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { ContractAdapter } from "./ContractAdapter";

export interface WriteContractAdapter extends ContractAdapter {
  writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ): Promise<string>;
  getSignerAddress(): Promise<string>;
  getUniqueSignerThreshold(blockNumber?: number): Promise<number>;
  getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]>;
}

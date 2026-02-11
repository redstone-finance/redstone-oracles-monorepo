import {
  ContractParamsProvider,
  IExtendedPricesContractAdapter,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { ContractAdapter, WriteContractAdapter } from "./ConnectorTypes";

export class BackwardCompatibleAdapter implements IExtendedPricesContractAdapter {
  constructor(private readonly connector: WriteContractAdapter) {}

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.connector.getUniqueSignerThreshold(blockNumber);
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, blockNumber?: number) {
    return await this.connector.readLatestUpdateBlockTimestamp(feedId, blockNumber);
  }

  async getSignerAddress() {
    return await this.connector.getSignerAddress();
  }

  async getDataFeedIds(blockTag?: number) {
    return await this.connector.getDataFeedIds?.(blockTag);
  }

  async readContractData(feedIds: string[], blockNumber?: number) {
    return await this.connector.readContractData(feedIds, blockNumber);
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    return await this.connector.getPricesFromPayload(paramsProvider);
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    return await this.connector.writePricesFromPayloadToContract(paramsProvider, options);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, blockNumber?: number) {
    return await this.connector.readPricesFromContract(paramsProvider, blockNumber);
  }

  async readTimestampFromContract(feedId?: string, blockNumber?: number) {
    return await this.connector.readTimestampFromContract(feedId, blockNumber);
  }
}

export class BackwardCompatibleReadOnlyAdapter implements IExtendedPricesContractAdapter {
  constructor(private readonly connector: ContractAdapter) {}

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.connector.getUniqueSignerThreshold(blockNumber);
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, blockNumber?: number) {
    return await this.connector.readLatestUpdateBlockTimestamp(feedId, blockNumber);
  }

  async getDataFeedIds(blockTag?: number) {
    return await this.connector.getDataFeedIds?.(blockTag);
  }

  async readContractData(feedIds: string[], blockNumber?: number) {
    return await this.connector.readContractData(feedIds, blockNumber);
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    return await this.connector.getPricesFromPayload(paramsProvider);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, blockNumber?: number) {
    return await this.connector.readPricesFromContract(paramsProvider, blockNumber);
  }

  async readTimestampFromContract(feedId?: string, blockNumber?: number) {
    return await this.connector.readTimestampFromContract(feedId, blockNumber);
  }

  /// both methods will be removed after full refactor

  getSignerAddress(): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  writePricesFromPayloadToContract(): Promise<string | bigint[]> {
    throw new Error("Method not implemented.");
  }
}

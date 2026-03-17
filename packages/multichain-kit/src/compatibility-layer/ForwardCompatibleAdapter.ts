import { ContractParamsProvider } from "@redstone-finance/sdk";
import { ContractAdapter } from "../ContractAdapter";
import { LegacyIContractConnector, LegacyPricesContractAdapter } from "../LegacyInterfaces";

export class ForwardCompatibleContractAdapter implements ContractAdapter {
  constructor(private readonly adapter: LegacyPricesContractAdapter) {}

  static async fromConnector(connector: LegacyIContractConnector<LegacyPricesContractAdapter>) {
    return new ForwardCompatibleContractAdapter(await connector.getAdapter());
  }

  async readContractData(feedIds: string[], blockNumber?: number, withDataFeedValues?: boolean) {
    return await this.adapter.readContractData(feedIds, blockNumber, withDataFeedValues);
  }

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.adapter.getUniqueSignerThreshold(blockNumber);
  }

  async getDataFeedIds(blockNumber?: number) {
    return await this.adapter.getDataFeedIds?.(blockNumber);
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    return await this.adapter.getPricesFromPayload(paramsProvider);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, blockNumber?: number) {
    return await this.adapter.readPricesFromContract(paramsProvider, blockNumber);
  }

  async readTimestampFromContract(feedId?: string, blockNumber?: number) {
    return await this.adapter.readTimestampFromContract(feedId, blockNumber);
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, blockNumber?: number) {
    return await this.adapter.readLatestUpdateBlockTimestamp(feedId, blockNumber);
  }
}

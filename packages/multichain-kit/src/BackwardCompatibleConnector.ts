import { IContractConnector } from "@redstone-finance/sdk";
import {
  BackwardCompatibleAdapter,
  BackwardCompatibleReadOnlyAdapter,
} from "./BackwardCompatibleAdapter";
import { BlockchainService, ContractAdapter, FullConnector } from "./ConnectorTypes";

export class BackwardCompatibleConnector implements IContractConnector<BackwardCompatibleAdapter> {
  constructor(private readonly connector: FullConnector) {}

  getAdapter(): Promise<BackwardCompatibleAdapter> {
    return Promise.resolve(new BackwardCompatibleAdapter(this.connector));
  }

  async getBlockNumber() {
    return await this.connector.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.connector.waitForTransaction(txId);
  }

  async getInstanceTtl(address: string) {
    return await this.connector.getInstanceTtl?.(address);
  }
}

export class BackwardCompatibleReadOnlyConnector
  implements IContractConnector<BackwardCompatibleReadOnlyAdapter>
{
  constructor(
    private readonly connector: ContractAdapter,
    private readonly service: BlockchainService
  ) {}

  getAdapter(): Promise<BackwardCompatibleReadOnlyAdapter> {
    return Promise.resolve(new BackwardCompatibleReadOnlyAdapter(this.connector));
  }

  async getBlockNumber() {
    return await this.service.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.service.waitForTransaction(txId);
  }

  async getInstanceTtl(address: string) {
    return await this.service.getInstanceTtl?.(address);
  }
}

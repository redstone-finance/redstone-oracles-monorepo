import { IContractConnector } from "@redstone-finance/sdk";
import { RadixClient } from "./RadixClient";

export class RadixContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  constructor(
    protected client: RadixClient,
    protected componentId?: string
  ) {}

  getAdapter(): Promise<Adapter> {
    throw new Error("getAdapter is not implemented");
  }

  async getBlockNumber(): Promise<number> {
    return await this.client.getCurrentEpochNumber();
  }

  async waitForTransaction(transactionId: string): Promise<boolean> {
    return await this.client.waitForCommit(transactionId);
  }
}

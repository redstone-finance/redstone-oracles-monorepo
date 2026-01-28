import { IContractConnector } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";

export abstract class CantonContractConnector<Adapter> implements IContractConnector<Adapter> {
  constructor(protected cantonClient: CantonClient) {}

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  waitForTransaction(_txId: string) {
    return Promise.resolve(true);
  }

  abstract getAdapter(): Promise<Adapter>;
}

import { BlockchainService } from "@redstone-finance/multichain-kit";
import { CantonClient } from "./CantonClient";

export class CantonBlockchainService implements BlockchainService {
  constructor(protected readonly cantonClient: CantonClient) {}

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  getTransactionsInWindow(interfaceId: string, from: number, to: number) {
    return this.cantonClient.getGetPricesTransactions(interfaceId, from, to);
  }

  waitForTransaction(_txId: string) {
    return Promise.resolve(true);
  }

  getTimeForBlock(): Promise<Date> {
    return Promise.resolve(new Date());
  }

  getNormalizedBalance(_address: string, _blockNumber?: number): Promise<bigint> {
    throw new Error("Method not implemented.");
  }
  getBalance(_addressOrName: string, _blockTag?: number): Promise<bigint> {
    throw new Error("Method not implemented.");
  }
}

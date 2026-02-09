import { CantonClient } from "@redstone-finance/canton-connector";

export class CantonBlockchainService {
  constructor(private readonly cantonClient: CantonClient) {}

  getTransactionsInWindow(interfaceId: string, from: number, to: number) {
    return this.cantonClient.getGetPricesTransactions(interfaceId, from, to);
  }

  getBlockNumber() {
    return this.cantonClient.getCurrentOffset();
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Needed method for interface, but not doable in canton context
  getTimeForBlock(): Promise<Date> {
    return Promise.resolve(new Date());
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Needed method for interface, but not doable in canton context
  getBalance(): Promise<bigint> {
    throw new Error("Method not implemented.");
  }
}

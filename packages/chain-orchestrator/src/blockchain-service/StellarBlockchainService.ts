import {
  StellarBlockchainService as Service,
  StellarClient,
} from "@redstone-finance/stellar-connector";
import { rpc } from "@stellar/stellar-sdk";

export type EventWithTx = {
  event: rpc.Api.EventResponse;
  tx: rpc.Api.GetSuccessfulTransactionResponse | rpc.Api.GetFailedTransactionResponse;
};

export class StellarBlockchainService extends Service {
  constructor(client: StellarClient) {
    super(client);
  }

  async getTimeForBlock(sequence: number) {
    return await this.client.getTimeForBlock(sequence);
  }

  async getTransactions(
    startLedger: number,
    endLedger: number
  ): Promise<rpc.Api.TransactionInfo[]> {
    return await this.client.getTransactions(startLedger, endLedger);
  }

  async getEventsWithTransactions(startLedger: number, endLedger: number): Promise<EventWithTx[]> {
    return await this.client.getEventsWithTransactions(startLedger, endLedger);
  }
}

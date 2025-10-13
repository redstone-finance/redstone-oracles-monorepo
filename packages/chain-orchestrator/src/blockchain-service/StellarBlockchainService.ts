import { StellarClient, StellarContractConnector } from "@redstone-finance/stellar-connector";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export type EventWithTx = {
  event: rpc.Api.EventResponse;
  tx: rpc.Api.GetSuccessfulTransactionResponse | rpc.Api.GetFailedTransactionResponse;
};

export class StellarBlockchainService extends NonEvmBlockchainService {
  constructor(
    private client: StellarClient,
    keypair?: Keypair
  ) {
    super(new StellarContractConnector(client, keypair));
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

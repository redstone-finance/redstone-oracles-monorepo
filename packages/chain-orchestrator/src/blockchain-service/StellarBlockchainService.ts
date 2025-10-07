import { StellarClient, StellarContractConnector } from "@redstone-finance/stellar-connector";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

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

  async getEvents(startLedger: number, endLedger: number): Promise<rpc.Api.EventResponse[]> {
    return await this.client.getEvents(startLedger, endLedger);
  }
}

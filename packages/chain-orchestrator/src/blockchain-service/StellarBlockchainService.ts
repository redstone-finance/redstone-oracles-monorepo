import {
  StellarContractConnector,
  StellarRpcClient,
} from "@redstone-finance/stellar-connector";
import { rpc } from "@stellar/stellar-sdk";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class StellarBlockchainService extends NonEvmBlockchainService {
  constructor(private client: StellarRpcClient) {
    super(new StellarContractConnector(client));
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
}

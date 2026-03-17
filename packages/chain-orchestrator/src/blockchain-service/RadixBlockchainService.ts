import {
  RadixClient,
  RadixContractConnector,
  TransactionStatusFilter,
} from "@redstone-finance/radix-connector";
import { NonEvmBlockchainServiceWithTransfer } from "./NonEvmBlockchainService";

export class RadixBlockchainService extends NonEvmBlockchainServiceWithTransfer {
  constructor(private client: RadixClient) {
    super(new RadixContractConnector(client));
  }

  async getTransactions(
    fromStateVersion: number,
    toStateVersion: number,
    addresses: string[],
    transaction_status?: TransactionStatusFilter
  ) {
    return await this.client.getTransactions(
      fromStateVersion,
      toStateVersion,
      addresses,
      transaction_status
    );
  }
}

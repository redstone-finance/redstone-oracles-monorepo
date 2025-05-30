import {
  RadixClient,
  RadixContractConnector,
  TransactionStatusFilter,
} from "@redstone-finance/radix-connector";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class RadixBlockchainService extends NonEvmBlockchainService {
  constructor(private client: RadixClient) {
    super(new RadixContractConnector(client));
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  getTimeForBlock(_blockHeight: number) {
    console.warn("getTimeForBlock is not supported for Radix");
    return Promise.resolve(new Date(0));
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

import {
  RadixClient,
  RadixContractConnector,
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
    fromEpochNumber: number,
    toEpochNumber: number,
    addresses: string[]
  ) {
    return await this.client.getTransactions(
      fromEpochNumber,
      toEpochNumber,
      addresses
    );
  }
}

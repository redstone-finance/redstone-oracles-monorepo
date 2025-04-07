import { SolanaContractConnector } from "@redstone-finance/solana-connector";
import { loggerFactory } from "@redstone-finance/utils";
import { Connection } from "@solana/web3.js";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class SolanaBlockchainService extends NonEvmBlockchainService {
  private readonly logger = loggerFactory("solana-blockchain-service");

  constructor(private connection: Connection) {
    super(new SolanaContractConnector(connection));
  }

  async getTimeForBlock(slot: number): Promise<Date> {
    const timestamp = await this.connection.getBlockTime(slot);

    return new Date((timestamp || 0) * 1000);
  }

  async getBlockWithTransactions(slot: number) {
    const block = await this.connection.getBlock(slot, {
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full",
    });

    return block;
  }
}

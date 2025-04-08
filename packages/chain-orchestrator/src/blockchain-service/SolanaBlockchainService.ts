import { SolanaContractConnector } from "@redstone-finance/solana-connector";
import { loggerFactory } from "@redstone-finance/utils";
import { ConfirmedSignatureInfo, Connection, PublicKey } from "@solana/web3.js";
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

  async getTransactions(fromSlot: number, toSlot: number, addresses: string[]) {
    const allSignatures: ConfirmedSignatureInfo[] = [];
    for (const address of addresses) {
      allSignatures.push(
        ...(await this.connection.getSignaturesForAddress(
          new PublicKey(address)
        ))
      );
    }

    const filteredSignatures = allSignatures.filter(
      (sig) => sig.slot >= fromSlot && sig.slot <= toSlot
    );

    const transactionDetailsPromises = filteredSignatures.map((signature) =>
      this.connection.getTransaction(signature.signature, {
        maxSupportedTransactionVersion: 0,
      })
    );

    return await Promise.all(transactionDetailsPromises);
  }
}

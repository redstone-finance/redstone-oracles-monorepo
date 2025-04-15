import { SolanaContractConnector } from "@redstone-finance/solana-connector";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { ConfirmedSignatureInfo, Connection, PublicKey } from "@solana/web3.js";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

const TRANSACTION_FETCHING_BATCH_SIZE = 1000;

export class SolanaBlockchainService extends NonEvmBlockchainService {
  private logger = loggerFactory("solana-blockchain-service");

  constructor(private connection: Connection) {
    super(new SolanaContractConnector(connection));
  }

  async getTimeForBlock(slot: number): Promise<Date> {
    const timestamp = await this.connection.getBlockTime(slot);

    return new Date((timestamp || 0) * 1000);
  }

  async getBlockWithTransactions(slot: number) {
    return await this.connection.getBlock(slot, {
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full",
    });
  }

  async getTransactions(fromSlot: number, toSlot: number, addresses: string[]) {
    let fromSlotSignature, toSlotSignature;

    try {
      const [fromSlotSignatures, toSlotSignatures] = await Promise.all([
        await this.connection.getBlockSignatures(fromSlot),
        await this.connection.getBlockSignatures(toSlot),
      ]);
      fromSlotSignature = fromSlotSignatures.signatures[0];
      toSlotSignature =
        toSlotSignatures.signatures[toSlotSignatures.signatures.length - 1];
    } catch (error) {
      this.logger.warn(
        `Slot is missing, using latest ${TRANSACTION_FETCHING_BATCH_SIZE} signatures; ${RedstoneCommon.stringifyError(error)}`
      );
    }

    const allSignatures: ConfirmedSignatureInfo[] = [];
    for (const address of addresses) {
      allSignatures.push(
        ...(await this.getAllSignatureInfos(
          address,
          fromSlotSignature,
          toSlotSignature
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

  private async getAllSignatureInfos(
    address: string,
    minTransactionSignature?: string,
    maxTransactionSignature?: string
  ): Promise<ConfirmedSignatureInfo[]> {
    const result = await this.connection.getSignaturesForAddress(
      new PublicKey(address),
      {
        limit: TRANSACTION_FETCHING_BATCH_SIZE,
        before: maxTransactionSignature,
        until: minTransactionSignature,
      }
    );

    if (
      result.length === TRANSACTION_FETCHING_BATCH_SIZE &&
      (minTransactionSignature || maxTransactionSignature)
    ) {
      const previousSignatures = await this.getAllSignatureInfos(
        address,
        minTransactionSignature,
        result[0].signature
      );

      result.push(...previousSignatures);
    }

    return result;
  }
}

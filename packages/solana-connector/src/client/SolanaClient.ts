import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import {
  AccountInfo,
  Commitment,
  ConfirmOptions,
  Connection,
  GetRecentPrioritizationFeesConfig,
  GetVersionedTransactionConfig,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SendOptions,
  SignaturesForAddressOptions,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const SOLANA_SLOT_TIME_INTERVAL_MS = 400;

export class SolanaClient {
  constructor(readonly connection: Connection) {}

  async getAccountInfo<T>(
    address: PublicKey,
    decoder: (buffer: AccountInfo<Buffer>) => T,
    slot: number | undefined,
    description?: string
  ) {
    const slotData = await this.waitForSlot(slot, description);
    const response = await this.connection.getAccountInfo(address, slotData);

    if (!response) {
      throw new Error(`Could not fetch data for account ${address.toBase58()}`);
    }

    return decoder(response);
  }

  async getMultipleAccountsInfo<T>(
    accounts: PublicKey[],
    singleAccountDecoder: (buffer: AccountInfo<Buffer>) => T,
    description: string,
    slot?: number
  ) {
    const slotData = await this.waitForSlot(slot, description);

    const response = await this.connection.getMultipleAccountsInfo(accounts, {
      ...slotData,
    });

    return response.map((value) => {
      if (!value) {
        return undefined;
      }

      return singleAccountDecoder(value);
    });
  }

  async getBlockhash(slot?: number, description?: string) {
    if (!slot) {
      return (await this.connection.getLatestBlockhash()).blockhash;
    }

    await this.waitForSlot(slot, description);

    const response = await this.connection.getBlock(slot, {
      maxSupportedTransactionVersion: undefined,
      rewards: false,
      transactionDetails: "none",
    });
    if (!response) {
      throw new Error(`Could not fetch data for block ${slot}`);
    }

    return response.blockhash;
  }

  async getBalance(address: PublicKey, slot?: number) {
    return await this.connection.getBalance(address, {
      minContextSlot: slot,
    });
  }

  async viewMethod<T>(
    method: { view: (options?: ConfirmOptions) => Promise<unknown> },
    slot?: number,
    description?: string
  ) {
    const slotData = await this.waitForSlot(slot, description);

    return (await method.view(slotData)) as T;
  }

  async getSignatureStatus(signature: string) {
    const status = await this.connection.getSignatureStatus(signature);

    return {
      isFinished: ["confirmed", "finalized"].includes(status.value?.confirmationStatus ?? ""),
      error: status.value?.err ?? undefined,
    };
  }

  async getSlot(commitment?: Commitment) {
    return await this.connection.getSlot(commitment);
  }

  async getRecentPrioritizationFees(config?: GetRecentPrioritizationFeesConfig) {
    return await this.connection.getRecentPrioritizationFees(config);
  }

  async sendTransaction(transaction: VersionedTransaction, options?: SendOptions) {
    return await this.connection.sendTransaction(transaction, options);
  }

  private async waitForSlot(slot?: number, description?: string) {
    if (!slot) {
      return undefined;
    }

    await RedstoneCommon.waitForBlockNumber(
      () => this.connection.getSlot(),
      slot,
      `${description ?? ""} in slot ${slot}`,
      SOLANA_SLOT_TIME_INTERVAL_MS,
      Math.floor(MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS / SOLANA_SLOT_TIME_INTERVAL_MS)
    );

    return { minContextSlot: slot };
  }

  async transfer(from: Keypair, toAddress: string, amountInSol: number) {
    amountInSol *= LAMPORTS_PER_SOL;
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amountInSol,
      })
    );

    await sendAndConfirmTransaction(this.connection, transaction, [from]);
  }

  static buildTransferTransaction(
    from: Keypair,
    to: PublicKey,
    lamports: number,
    recentBlockhash: string
  ) {
    const message = new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash,
      instructions: [
        SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports }),
      ],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    transaction.sign([from]);

    return transaction;
  }

  async getTimeForBlock(slot: number): Promise<Date> {
    const timestamp = await this.connection.getBlockTime(slot);

    return new Date((timestamp || 0) * 1000);
  }

  async getSignaturesForAddress(address: PublicKey, options?: SignaturesForAddressOptions) {
    return await this.connection.getSignaturesForAddress(address, options);
  }

  async getBlockSignatures(slot: number) {
    return await this.connection.getBlockSignatures(slot);
  }

  async getTransaction(signature: string, rawConfig: GetVersionedTransactionConfig) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- versioned config picks the non-deprecated overload at runtime
    return await this.connection.getTransaction(signature, rawConfig);
  }
}

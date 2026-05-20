import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import {
  AccountInfo,
  Commitment,
  ConfirmedSignatureInfo,
  ConfirmOptions,
  Connection,
  GetRecentPrioritizationFeesConfig,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SendOptions,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaConnectionBuilder } from "../SolanaConnectionBuilder";

const TX_FETCHING_BATCH_SIZE = 1000;
const txLogger = loggerFactory("solana-client-get-transactions");

export const SOLANA_SLOT_TIME_INTERVAL_MS = 400;

export class SolanaClient {
  constructor(private readonly connection: Connection) {}

  static createMultiClient(connection: Connection) {
    return MultiExecutor.createForSubInstances(
      connection,
      (conn) => new SolanaClient(conn),
      {
        getSlot: SolanaConnectionBuilder.blockNumberConsensusExecutor,
        viewMethod: MultiExecutor.ExecutionMode.AGREEMENT,
        getBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
        getSignatureStatus: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountInfo: MultiExecutor.ExecutionMode.AGREEMENT,
        getMultipleAccountsInfo: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
      },
      {
        ...MultiExecutor.DEFAULT_CONFIG,
        singleExecutionTimeoutMs: MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: MultiExecutor.ALL_EXECUTIONS_TIMEOUT_MS,
        multiAgreementShouldResolveUnagreedToUndefined: true,
      }
    );
  }

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

  async getTimeForBlock(slot: number): Promise<Date> {
    const timestamp = await this.connection.getBlockTime(slot);

    return new Date((timestamp || 0) * 1000);
  }

  async getTransactions(fromSlot: number, toSlot: number, addresses: string[]) {
    let fromSlotSignature, toSlotSignature;
    try {
      const [fromSlotSignatures, toSlotSignatures] = await Promise.all([
        this.connection.getBlockSignatures(fromSlot),
        this.connection.getBlockSignatures(toSlot),
      ]);
      fromSlotSignature = fromSlotSignatures.signatures[0];
      toSlotSignature = toSlotSignatures.signatures[toSlotSignatures.signatures.length - 1];
    } catch (error) {
      txLogger.warn(
        `Slot is missing, using latest ${TX_FETCHING_BATCH_SIZE} signatures; ${RedstoneCommon.stringifyError(error)}`
      );
    }

    const allSignatures: ConfirmedSignatureInfo[] = [];
    for (const address of addresses) {
      allSignatures.push(
        ...(await this.getAllSignatureInfos(address, fromSlotSignature, toSlotSignature))
      );
    }

    const filtered = allSignatures.filter((sig) => sig.slot >= fromSlot && sig.slot <= toSlot);

    return await Promise.all(
      filtered.map((sig) =>
        this.connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 })
      )
    );
  }

  private async getAllSignatureInfos(
    address: string,
    minTxSig?: string,
    maxTxSig?: string
  ): Promise<ConfirmedSignatureInfo[]> {
    const result = await this.connection.getSignaturesForAddress(new PublicKey(address), {
      limit: TX_FETCHING_BATCH_SIZE,
      before: maxTxSig,
      until: minTxSig,
    });

    if (result.length === TX_FETCHING_BATCH_SIZE && minTxSig && maxTxSig) {
      const previous = await this.getAllSignatureInfos(address, minTxSig, result[0].signature);
      result.push(...previous);
    }

    return result;
  }
}

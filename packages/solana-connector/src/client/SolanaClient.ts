import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import {
  AccountInfo,
  ConfirmOptions,
  Connection,
  GetRecentPrioritizationFeesConfig,
  PublicKey,
  SendOptions,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaConnectionBuilder } from "../SolanaConnectionBuilder";

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
      isFinished: ["confirmed", "finalized"].includes(
        status.value?.confirmationStatus ?? ""
      ),
      error: status.value?.err ?? undefined,
    };
  }

  async getSlot() {
    return await this.connection.getSlot();
  }

  async getRecentPrioritizationFees(
    config?: GetRecentPrioritizationFeesConfig
  ) {
    return await this.connection.getRecentPrioritizationFees(config);
  }

  async sendTransaction(
    transaction: VersionedTransaction,
    options?: SendOptions
  ) {
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
      Math.floor(
        MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS / SOLANA_SLOT_TIME_INTERVAL_MS
      )
    );

    return { minContextSlot: slot };
  }
}

import { Collector, RedstoneCommon } from "@redstone-finance/utils";
import { GetVersionedTransactionConfig, VersionedTransactionResponse } from "@solana/web3.js";

export type GetTransactionsRequestCollectorDelegate = {
  getTransactionsRequestCollectorGetTransactions(
    signatures: string[],
    config: GetVersionedTransactionConfig
  ): Promise<(VersionedTransactionResponse | null)[]>;
  getTransactionsRequestCollectorGetTransaction(
    signature: string,
    config: GetVersionedTransactionConfig
  ): Promise<VersionedTransactionResponse | null>;
};

const DEFAULT_COLLECTING_INTERVAL_MS = 10;
const MAX_NUMBER_OF_TRANSACTIONS_TO_FETCH = 100; // solana JSON-RPC batch cap

export class GetTransactionsRequestCollector extends Collector.RequestCollector<
  string,
  VersionedTransactionResponse | null
> {
  delegate?: WeakRef<GetTransactionsRequestCollectorDelegate>;

  constructor(
    private readonly config: GetVersionedTransactionConfig,
    collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS
  ) {
    super("solana-transactions", MAX_NUMBER_OF_TRANSACTIONS_TO_FETCH, collectingIntervalMs);
  }

  protected override keyToString(signature: string) {
    return signature;
  }

  protected override async fetchBatch(signatures: string[]) {
    return await this.connection().getTransactionsRequestCollectorGetTransactions(
      signatures,
      this.config
    );
  }

  protected override async fetchSingle(signature: string) {
    return await this.connection().getTransactionsRequestCollectorGetTransaction(
      signature,
      this.config
    );
  }

  protected override isBatchUnsupportedError(error: unknown) {
    return RedstoneCommon.stringifyError(error).toLowerCase().includes("batch");
  }

  private connection() {
    const connection = this.delegate?.deref();

    if (!connection) {
      throw new Error("Connection not set - delegate is empty");
    }

    return connection;
  }
}

export function getTransactionConfigKey(config: GetVersionedTransactionConfig) {
  return [config.commitment, config.maxSupportedTransactionVersion].join("#");
}

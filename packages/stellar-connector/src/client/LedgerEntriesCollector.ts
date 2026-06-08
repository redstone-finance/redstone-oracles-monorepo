import { Collector } from "@redstone-finance/utils";
import { rpc, xdr } from "@stellar/stellar-sdk";

const COLLECTING_INTERVAL_MS = 100;
export const MAX_LEDGER_ENTRIES_PER_REQUEST = 195;

export type LedgerEntriesCollectorDelegate = {
  ledgerEntriesCollectorGetLedgerEntries(
    keys: xdr.LedgerKey[],
    blockNumber?: number
  ): Promise<(rpc.Api.LedgerEntryResult | undefined)[]>;
  ledgerEntriesCollectorDispose?(blockNumber?: number): void;
};

export class LedgerEntriesCollector extends Collector.RequestCollector<
  xdr.LedgerKey,
  rpc.Api.LedgerEntryResult | undefined
> {
  delegate?: WeakRef<LedgerEntriesCollectorDelegate>;

  constructor(private readonly blockNumber?: number) {
    super(
      "stellar-ledger-entries",
      MAX_LEDGER_ENTRIES_PER_REQUEST,
      COLLECTING_INTERVAL_MS,
      blockNumber
    );
  }

  protected override keyToString(key: xdr.LedgerKey) {
    return key.toXDR("base64");
  }

  protected override async fetchBatch(keys: xdr.LedgerKey[]) {
    const delegate = this.delegate?.deref();

    if (!delegate) {
      throw new Error("Delegate not set - delegate is empty");
    }

    return await delegate.ledgerEntriesCollectorGetLedgerEntries(keys, this.blockNumber);
  }

  protected override onIdle() {
    this.delegate?.deref()?.ledgerEntriesCollectorDispose?.(this.blockNumber);
  }
}

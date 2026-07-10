import { Collector } from "@redstone-finance/utils";
import { AccountInfo, Commitment, DataSlice, PublicKey } from "@solana/web3.js";

export type CollectableCommitmentOrConfig =
  | Commitment
  | { minContextSlot?: number; commitment?: Commitment; dataSlice?: DataSlice };

export type GetAccountsInfoRequestCollectorDelegate = {
  getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
    publicKeys: PublicKey[],
    commitmentOrConfig?: CollectableCommitmentOrConfig
  ): GetMultipleAccountsInfoResult;
  getAccountsInfoRequestCollectorDispose?(commitmentOrConfig?: CollectableCommitmentOrConfig): void;
};
type GetMultipleAccountsInfoResult = Promise<(AccountInfo<Buffer> | null)[]>;

const DEFAULT_COLLECTING_INTERVAL_MS = 10;
const MAX_NUMBER_OF_ACCOUNTS_TO_FETCH = 100; // solana requirement

export class GetAccountsInfoRequestCollector extends Collector.RequestCollector<
  PublicKey,
  AccountInfo<Buffer> | null
> {
  delegate?: WeakRef<GetAccountsInfoRequestCollectorDelegate>;

  constructor(
    private readonly commitmentOrConfig?: CollectableCommitmentOrConfig,
    collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS
  ) {
    super(
      "solana-accounts-info",
      MAX_NUMBER_OF_ACCOUNTS_TO_FETCH,
      collectingIntervalMs,
      commitmentOrConfig
    );
  }

  protected override keyToString(publicKey: PublicKey) {
    return publicKey.toBase58();
  }

  protected override async fetchBatch(publicKeys: PublicKey[]) {
    const connection = this.delegate?.deref();

    if (!connection) {
      throw new Error("Connection not set - delegate is empty");
    }

    try {
      return await connection.getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
        publicKeys,
        this.commitmentOrConfig
      );
    } finally {
      connection.getAccountsInfoRequestCollectorDispose?.(this.commitmentOrConfig);
    }
  }
}

export function getCommitmentOrConfigKey(commitmentOrConfig?: CollectableCommitmentOrConfig) {
  return !commitmentOrConfig
    ? ""
    : typeof commitmentOrConfig === "string"
      ? commitmentOrConfig
      : [
          ...(commitmentOrConfig.commitment ||
          commitmentOrConfig.minContextSlot ||
          commitmentOrConfig.dataSlice
            ? [commitmentOrConfig.commitment]
            : []),
          ...(commitmentOrConfig.minContextSlot || commitmentOrConfig.dataSlice
            ? [commitmentOrConfig.minContextSlot]
            : []),
          ...(commitmentOrConfig.dataSlice
            ? [commitmentOrConfig.dataSlice.length, commitmentOrConfig.dataSlice.offset]
            : []),
        ].join("#");
}

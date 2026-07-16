import { Collector } from "@redstone-finance/utils";
import { RpcResponseAndContext, SignatureStatus, SignatureStatusConfig } from "@solana/web3.js";

export type CollectableSignatureStatus = RpcResponseAndContext<SignatureStatus | null>;

export type GetSignatureStatusesRequestCollectorDelegate = {
  getSignatureStatusesRequestCollectorGetSignatureStatuses(
    signatures: string[],
    config?: SignatureStatusConfig
  ): Promise<RpcResponseAndContext<(SignatureStatus | null)[]>>;
};

const DEFAULT_COLLECTING_INTERVAL_MS = 20;
const MAX_NUMBER_OF_SIGNATURES_TO_FETCH = 256;

export class GetSignatureStatusesRequestCollector extends Collector.RequestCollector<
  string,
  CollectableSignatureStatus
> {
  delegate?: WeakRef<GetSignatureStatusesRequestCollectorDelegate>;

  constructor(
    private readonly config?: SignatureStatusConfig,
    collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS
  ) {
    super(
      "solana-signature-statuses",
      MAX_NUMBER_OF_SIGNATURES_TO_FETCH,
      collectingIntervalMs,
      config
    );
  }

  protected override keyToString(signature: string) {
    return signature;
  }

  protected override async fetchBatch(signatures: string[]) {
    const connection = this.delegate?.deref();

    if (!connection) {
      throw new Error("Connection not set - delegate is empty");
    }

    const { context, value } =
      await connection.getSignatureStatusesRequestCollectorGetSignatureStatuses(
        signatures,
        this.config
      );

    return value.map((status) => ({ context, value: status }));
  }
}

export function getSignatureStatusConfigKey(config?: SignatureStatusConfig) {
  return config?.searchTransactionHistory ? "history" : "";
}

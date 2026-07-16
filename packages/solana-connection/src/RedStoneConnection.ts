import { Collector, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  BlockhashWithExpiryBlockHeight,
  Commitment,
  Connection,
  ConnectionConfig,
  EpochInfo,
  GetAccountInfoConfig,
  GetEpochInfoConfig,
  GetLatestBlockhashConfig,
  GetMultipleAccountsConfig,
  GetSlotConfig,
  GetTransactionConfig,
  GetVersionedTransactionConfig,
  PublicKey,
  SignatureStatusConfig,
  TransactionResponse,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import {
  CollectableCommitmentOrConfig,
  GetAccountsInfoRequestCollector,
  GetAccountsInfoRequestCollectorDelegate,
  getCommitmentOrConfigKey,
} from "./GetAccountsInfoRequestCollector";
import {
  getSignatureStatusConfigKey,
  GetSignatureStatusesRequestCollector,
  GetSignatureStatusesRequestCollectorDelegate,
} from "./GetSignatureStatusesRequestCollector";
import {
  getTransactionConfigKey,
  GetTransactionsRequestCollector,
  GetTransactionsRequestCollectorDelegate,
} from "./GetTransactionsRequestCollector";

export class RedStoneConnection
  extends Connection
  implements
    GetAccountsInfoRequestCollectorDelegate,
    GetTransactionsRequestCollectorDelegate,
    GetSignatureStatusesRequestCollectorDelegate
{
  private static instances: { [url: string]: RedStoneConnection | undefined } = {};

  private logger = loggerFactory("redstone-solana-connection");
  private readonly getAccountsInfoRequestCollectors = new Collector.CollectorRegistry(
    getCommitmentOrConfigKey,
    this.createCollector.bind(this)
  );
  private readonly getTransactionsRequestCollectors = new Collector.CollectorRegistry(
    getTransactionConfigKey,
    this.createTransactionsCollector.bind(this)
  );
  private readonly getSignatureStatusesRequestCollectors = new Collector.CollectorRegistry(
    getSignatureStatusConfigKey,
    this.createSignatureStatusesCollector.bind(this)
  );
  private getEpochInfoPromise?: Promise<EpochInfo>;
  private getSlotPromise?: Promise<number>;
  private getLatestBlockhashPromise?: Promise<BlockhashWithExpiryBlockHeight>;

  static instanceForUrl(url: string, commitmentOrConfig?: Commitment | ConnectionConfig) {
    return (RedStoneConnection.instances[url] ??= new RedStoneConnection(url, commitmentOrConfig));
  }

  constructor(endpoint: string, commitmentOrConfig?: Commitment | ConnectionConfig) {
    super(endpoint, commitmentOrConfig);
  }

  override async getMultipleAccountsInfo(
    publicKeys: PublicKey[],
    commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
  ) {
    return await this.getAccountsInfoRequestCollectors
      .get(commitmentOrConfig)
      .collectMany(publicKeys);
  }

  override async getAccountInfo(
    publicKey: PublicKey,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig
  ) {
    const [result] = await this.getAccountsInfoRequestCollectors
      .get(commitmentOrConfig)
      .collectMany([publicKey]);

    return result;
  }

  override getTransaction(
    signature: string,
    rawConfig?: GetTransactionConfig
  ): Promise<TransactionResponse | null>;
  override getTransaction(
    signature: string,
    rawConfig: GetVersionedTransactionConfig
  ): Promise<VersionedTransactionResponse>;
  override async getTransaction(
    signature: string,
    rawConfig?: GetTransactionConfig | GetVersionedTransactionConfig
  ) {
    if (!rawConfig || !("maxSupportedTransactionVersion" in rawConfig)) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- preserves base behavior for non-versioned callers
      return await super.getTransaction(signature, rawConfig as GetTransactionConfig);
    }

    const tx = await this.getTransactionsRequestCollectors.get(rawConfig).collect(signature);
    if (!RedstoneCommon.isDefined(tx)) {
      throw new Error(`Transaction ${signature} not found on this RPC`);
    }

    return tx;
  }

  override async getEpochInfo(
    commitmentOrConfig?: Commitment | GetEpochInfoConfig
  ): Promise<EpochInfo> {
    if (commitmentOrConfig) {
      this.logger.debug("getEpochInfo - skips collecting due to commitmentOrConfig set");

      return await super.getEpochInfo(commitmentOrConfig);
    }

    this.getEpochInfoPromise ??= super.getEpochInfo(commitmentOrConfig);

    try {
      return await this.getEpochInfoPromise;
    } finally {
      this.getEpochInfoPromise = undefined;
    }
  }

  override async getSlot(commitmentOrConfig?: Commitment | GetSlotConfig): Promise<number> {
    if (commitmentOrConfig) {
      this.logger.debug("getSlot - skips collecting due to commitmentOrConfig set");

      return await super.getSlot(commitmentOrConfig);
    }

    this.getSlotPromise ??= super.getSlot(commitmentOrConfig);

    try {
      return await this.getSlotPromise;
    } finally {
      this.getSlotPromise = undefined;
    }
  }

  override async getLatestBlockhash(commitmentOrConfig?: Commitment | GetLatestBlockhashConfig) {
    if (commitmentOrConfig) {
      return await super.getLatestBlockhash(commitmentOrConfig);
    }

    this.getLatestBlockhashPromise ??= super.getLatestBlockhash(commitmentOrConfig);

    try {
      return await this.getLatestBlockhashPromise;
    } finally {
      this.getLatestBlockhashPromise = undefined;
    }
  }

  override async getSignatureStatus(signature: string, config?: SignatureStatusConfig) {
    return await this.getSignatureStatusesRequestCollectors.get(config).collect(signature);
  }

  private createCollector(commitmentOrConfig?: CollectableCommitmentOrConfig) {
    const collector = new GetAccountsInfoRequestCollector(commitmentOrConfig);
    collector.delegate = new WeakRef(this);

    return collector;
  }

  private createTransactionsCollector(config: GetVersionedTransactionConfig) {
    const collector = new GetTransactionsRequestCollector(config);
    collector.delegate = new WeakRef(this);

    return collector;
  }

  private createSignatureStatusesCollector(config?: SignatureStatusConfig) {
    const collector = new GetSignatureStatusesRequestCollector(config);
    collector.delegate = new WeakRef(this);

    return collector;
  }

  /// GetAccountsInfoRequestCollectorDelegate

  getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
    publicKeys: PublicKey[],
    commitmentOrConfig?: CollectableCommitmentOrConfig
  ) {
    return super.getMultipleAccountsInfo(publicKeys, commitmentOrConfig);
  }

  getAccountsInfoRequestCollectorDispose(commitmentOrConfig?: CollectableCommitmentOrConfig) {
    this.getAccountsInfoRequestCollectors.delete(commitmentOrConfig);
  }

  /// GetTransactionsRequestCollectorDelegate

  getTransactionsRequestCollectorGetTransactions(
    signatures: string[],
    config: GetVersionedTransactionConfig
  ) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- versioned config picks the non-deprecated overload at runtime
    return super.getTransactions(signatures, config);
  }

  getTransactionsRequestCollectorGetTransaction(
    signature: string,
    config: GetVersionedTransactionConfig
  ) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- versioned config picks the non-deprecated overload at runtime
    return super.getTransaction(signature, config);
  }

  getSignatureStatusesRequestCollectorGetSignatureStatuses(
    signatures: string[],
    config?: SignatureStatusConfig
  ) {
    return super.getSignatureStatuses(signatures, config);
  }
}

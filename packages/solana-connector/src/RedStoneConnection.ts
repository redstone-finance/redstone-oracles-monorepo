import { Collector, loggerFactory } from "@redstone-finance/utils";
import {
  Commitment,
  Connection,
  ConnectionConfig,
  EpochInfo,
  GetAccountInfoConfig,
  GetEpochInfoConfig,
  GetMultipleAccountsConfig,
  GetSlotConfig,
  PublicKey,
} from "@solana/web3.js";
import {
  CollectableCommitmentOrConfig,
  GetAccountsInfoRequestCollector,
  GetAccountsInfoRequestCollectorDelegate,
  getCommitmentOrConfigKey,
} from "./GetAccountsInfoRequestCollector";

export class RedStoneConnection
  extends Connection
  implements GetAccountsInfoRequestCollectorDelegate
{
  private logger = loggerFactory("redstone-solana-connection");
  private readonly getAccountsInfoRequestCollectors = new Collector.CollectorRegistry(
    getCommitmentOrConfigKey,
    this.createCollector.bind(this)
  );
  private getEpochInfoPromise?: Promise<EpochInfo>;
  private getSlotPromise?: Promise<number>;

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

  private createCollector(commitmentOrConfig?: CollectableCommitmentOrConfig) {
    const collector = new GetAccountsInfoRequestCollector(commitmentOrConfig);
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
}

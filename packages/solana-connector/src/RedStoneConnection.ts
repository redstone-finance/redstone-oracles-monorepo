import { loggerFactory } from "@redstone-finance/utils";
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
} from "./GetAccountsInfoRequestCollector";

export class RedStoneConnection
  extends Connection
  implements GetAccountsInfoRequestCollectorDelegate
{
  private logger = loggerFactory("redstone-solana-connection");
  private getAccountsInfoRequestCollector = new GetAccountsInfoRequestCollector();
  private getEpochInfoPromise?: Promise<EpochInfo>;
  private getSlotPromise?: Promise<number>;

  constructor(endpoint: string, commitmentOrConfig?: Commitment | ConnectionConfig) {
    super(endpoint, commitmentOrConfig);

    this.getAccountsInfoRequestCollector.delegate = new WeakRef(this);
  }

  override async getMultipleAccountsInfo(
    publicKeys: PublicKey[],
    commitmentOrConfig?: Commitment | GetMultipleAccountsConfig
  ) {
    if (commitmentOrConfig) {
      this.logger.debug("getMultipleAccountsInfo - skips collecting due to commitmentOrConfig set");

      return await super.getMultipleAccountsInfo(publicKeys, commitmentOrConfig);
    }

    return await this.getAccountsInfoRequestCollector.getMultipleAccountInfoCollected(
      publicKeys,
      commitmentOrConfig
    );
  }

  override async getAccountInfo(
    publicKey: PublicKey,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig
  ) {
    if (commitmentOrConfig) {
      this.logger.debug("getAccountInfo - skips collecting due to commitmentOrConfig set");

      return await super.getAccountInfo(publicKey, commitmentOrConfig);
    }

    const result = await this.getAccountsInfoRequestCollector.getMultipleAccountInfoCollected(
      [publicKey],
      commitmentOrConfig
    );

    return result[0];
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

  /// GetAccountsInfoRequestCollectorDelegate

  getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
    publicKeys: PublicKey[],
    commitmentOrConfig: CollectableCommitmentOrConfig
  ) {
    return super.getMultipleAccountsInfo(publicKeys, commitmentOrConfig);
  }
}

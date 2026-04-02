import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import _ from "lodash";

export type CollectableCommitmentOrConfig = undefined;
export type GetAccountsInfoRequestCollectorDelegate = {
  getAccountsInfoRequestCollectorGetMultipleAccountsInfo: (
    publicKeys: PublicKey[],
    commitmentOrConfig: CollectableCommitmentOrConfig
  ) => GetMultipleAccountsInfoResult;
};
type GetMultipleAccountsInfoResult = Promise<(AccountInfo<Buffer> | null)[]>;

const DEFAULT_COLLECTING_INTERVAL_MS = 10;
const MAX_NUMBER_OF_ACCOUNTS_TO_FETCH = 100; // solana requirement

export class GetAccountsInfoRequestCollector {
  delegate?: WeakRef<GetAccountsInfoRequestCollectorDelegate>;

  private logger = loggerFactory("get-accounts-info-cache");

  private requestedCalls = 0;
  private actualCalls = 0;
  private timer?: NodeJS.Timeout;

  constructor(private readonly collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS) {}

  private getMultipleAccountsInfoPending: {
    [key: string]: { promise: GetMultipleAccountsInfoResult; index: number } | undefined;
  } = {};
  private waitingEntries: {
    publicKeys: PublicKey[];
    resolve: (value: (AccountInfo<Buffer> | null)[]) => void;
    reject: (err: unknown) => void;
  }[] = [];

  dispose() {
    this.clearTimer();

    const error = new Error("GetAccountsInfoRequestCollector disposed");

    for (const entry of this.waitingEntries) {
      try {
        entry.reject(error);
      } catch (e) {
        this.logger.warn(`dispose reject error: ${RedstoneCommon.stringifyError(e)}`);
      }
    }

    this.waitingEntries = [];
    this.getMultipleAccountsInfoPending = {};
  }

  async getMultipleAccountInfoCollected(
    publicKeys: PublicKey[],
    commitmentOrConfig?: CollectableCommitmentOrConfig
  ) {
    const remaining = publicKeys.filter(
      (publicKey) => !this.getMultipleAccountsInfoPending[publicKey.toBase58()]
    );

    let promise: GetMultipleAccountsInfoResult | undefined;

    if (remaining.length) {
      const call = this.registerMultipleAccountsInfoCall(remaining, commitmentOrConfig);

      remaining.forEach(
        (publicKey, index) =>
          (this.getMultipleAccountsInfoPending[publicKey.toBase58()] = {
            promise: call,
            index,
          })
      );

      promise = call;
    }

    const promises = publicKeys.map((publicKey) => {
      const entry = this.getMultipleAccountsInfoPending[publicKey.toBase58()];

      if (!entry) {
        throw new Error("That shouldn't have happened!");
      }

      return entry.promise.then((result) => result[entry.index]);
    });

    try {
      const result = await Promise.all(promises);

      this.logger.debug(
        `getMultipleAccountsInfo did make ${this.actualCalls} of ${this.requestedCalls++} requested calls`
      );

      return result;
    } finally {
      if (promise) {
        Object.entries(this.getMultipleAccountsInfoPending)
          .filter(([_, entry]) => entry?.promise === promise)
          .forEach(([publicKey]) => delete this.getMultipleAccountsInfoPending[publicKey]);
      }
    }
  }

  private async registerMultipleAccountsInfoCall(
    publicKeys: PublicKey[],
    commitmentOrConfig?: CollectableCommitmentOrConfig
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    const waitingKeysCount = this.waitingEntries.reduce(
      (sum, entry) => sum + entry.publicKeys.length,
      0
    );

    if (publicKeys.length + waitingKeysCount > MAX_NUMBER_OF_ACCOUNTS_TO_FETCH) {
      await this.consumeWaitingEntries(commitmentOrConfig);
    }

    return await new Promise((resolve, reject) => {
      this.waitingEntries.push({ publicKeys, resolve, reject });
      this.timer ??= setTimeout(
        () =>
          void this.consumeWaitingEntries(commitmentOrConfig).catch((e) =>
            this.logger.error(`consumeWaitingEntries failed: ${RedstoneCommon.stringifyError(e)}`)
          ),
        this.collectingIntervalMs
      );
    });
  }

  private async consumeWaitingEntries(commitmentOrConfig?: CollectableCommitmentOrConfig) {
    const entries = this.waitingEntries;
    this.waitingEntries = [];
    this.clearTimer();

    const connection = this.delegate?.deref();

    if (!connection) {
      entries.forEach((entry) => entry.reject(new Error("Connection not set - delegate is empty")));

      throw new Error("Connection not set - delegate is empty");
    }

    const allKeys = entries.flatMap((e) => e.publicKeys);
    const chunks = _.chunk(allKeys, MAX_NUMBER_OF_ACCOUNTS_TO_FETCH);

    try {
      const chunkPromises = chunks.map((chunk) => {
        this.actualCalls++;

        this.logger.info(
          `getMultipleAccountsInfo - Calling for ${chunk.length} key${RedstoneCommon.getS(chunk.length)}`
        );

        return connection.getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
          chunk,
          commitmentOrConfig
        );
      });
      const allResults = (await Promise.all(chunkPromises)).flat();

      let offset = 0;
      for (const entry of entries) {
        entry.resolve(allResults.slice(offset, offset + entry.publicKeys.length));
        offset += entry.publicKeys.length;
      }
    } catch (err) {
      entries.forEach((entry) => entry.reject(err));
    }
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

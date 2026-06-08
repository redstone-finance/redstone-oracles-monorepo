import _ from "lodash";
import { getNS, stringify, stringifyError } from "../common";
import { loggerFactory } from "../logger";

export abstract class RequestCollector<Key, Result> {
  private readonly logger;

  private requestedCalls = 0;
  private actualCalls = 0;
  private timer?: NodeJS.Timeout;
  private activeRegisterCalls = 0;
  private activeConsumeCalls = 0;
  protected readonly label: string;

  private pending: {
    [keyStr: string]: { promise: Promise<Result[]>; index: number } | undefined;
  } = {};
  private waitingEntries: {
    keys: Key[];
    resolve: (results: Result[]) => void;
    reject: (err: unknown) => void;
  }[] = [];

  protected constructor(
    label: string,
    private readonly maxBatchSize: number,
    private readonly collectingIntervalMs: number,
    readonly variant?: unknown
  ) {
    this.label = `${label}${variant ? `[${stringify(variant)}]` : ""}`;
    this.logger = loggerFactory(`request-collector-${this.label}`);
  }

  private batchSupported = true;

  protected abstract keyToString(key: Key): string;
  protected abstract fetchBatch(keys: Key[]): Promise<Result[]>;

  protected fetchSingle?(key: Key): Promise<Result>;
  protected isBatchUnsupportedError?(error: unknown): boolean;
  protected onIdle?(): void;

  dispose() {
    this.clearTimer();

    const error = new Error(`${this.constructor.name} disposed`);

    for (const entry of this.waitingEntries) {
      try {
        entry.reject(error);
      } catch (e) {
        this.logger.warn(`dispose reject error: ${stringifyError(e)}`);
      }
    }

    this.waitingEntries = [];
    this.pending = {};
  }

  async collectMany(keys: Key[]) {
    const remaining = keys.filter((k) => !this.pending[this.keyToString(k)]);

    let myPromise: Promise<Result[]> | undefined;

    if (remaining.length) {
      const call = this.registerCall(remaining);

      remaining.forEach((k, index) => {
        this.pending[this.keyToString(k)] = { promise: call, index };
      });

      myPromise = call;
    }

    const promises = keys.map((k) => {
      const entry = this.pending[this.keyToString(k)];

      if (!entry) {
        throw new Error("RequestCollector dedup invariant violated");
      }

      return entry.promise.then((result) => result[entry.index]);
    });

    try {
      const result = await Promise.all(promises);

      this.logger.trace(
        `${this.label} made ${this.actualCalls} of ${++this.requestedCalls} requested calls`
      );

      return result;
    } finally {
      if (myPromise) {
        Object.entries(this.pending)
          .filter(([, entry]) => entry?.promise === myPromise)
          .forEach(([k]) => delete this.pending[k]);
      }
    }
  }

  async collect(key: Key) {
    const [result] = await this.collectMany([key]);

    return result;
  }

  private async registerCall(keys: Key[]) {
    this.activeRegisterCalls++;
    try {
      const waitingKeysCount = this.waitingEntries.reduce((sum, e) => sum + e.keys.length, 0);

      if (waitingKeysCount > 0 && keys.length + waitingKeysCount > this.maxBatchSize) {
        await this.consumeWaitingEntries();
      }

      return await new Promise<Result[]>((resolve, reject) => {
        this.waitingEntries.push({ keys, resolve, reject });
        this.timer ??= setTimeout(
          () =>
            void this.consumeWaitingEntries().catch((e) =>
              this.logger.error(`consumeWaitingEntries failed: ${stringifyError(e)}`)
            ),
          this.collectingIntervalMs
        );
      });
    } finally {
      this.activeRegisterCalls--;
      this.maybeFireOnIdle();
    }
  }

  private async consumeWaitingEntries() {
    this.activeConsumeCalls++;
    const entries = this.waitingEntries;
    this.waitingEntries = [];
    this.clearTimer();

    const allKeys = entries.flatMap((e) => e.keys);
    const chunks = _.chunk(allKeys, this.maxBatchSize);

    try {
      const chunkResults = await Promise.all(
        chunks.map((chunk) => {
          this.actualCalls++;

          this.logger.info(`${this.label} calling for ${getNS(chunk.length, "key")}`);

          return this.fetchChunk(chunk);
        })
      );
      const all = chunkResults.flat();

      let offset = 0;
      for (const entry of entries) {
        entry.resolve(all.slice(offset, offset + entry.keys.length));
        offset += entry.keys.length;
      }
    } catch (err) {
      entries.forEach((entry) => entry.reject(err));
    } finally {
      this.activeConsumeCalls--;
      this.maybeFireOnIdle();
    }
  }

  private maybeFireOnIdle() {
    if (
      this.activeConsumeCalls === 0 &&
      this.activeRegisterCalls === 0 &&
      this.waitingEntries.length === 0
    ) {
      this.onIdle?.();
    }
  }

  private async fetchChunk(keys: Key[]) {
    const fetchSingle = this.fetchSingle?.bind(this);
    if (!fetchSingle) {
      return await this.fetchBatch(keys);
    }
    if (keys.length === 1) {
      return [await fetchSingle(keys[0])];
    }
    if (!this.batchSupported) {
      return await Promise.all(keys.map(fetchSingle));
    }

    try {
      return await this.fetchBatch(keys);
    } catch (error) {
      if (!this.isBatchUnsupportedError?.(error)) {
        throw error;
      }
      this.logger.warn(
        `${this.label}: endpoint rejected batch request, falling back to individual requests`
      );
      this.batchSupported = false;

      return await Promise.all(keys.map(fetchSingle));
    }
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

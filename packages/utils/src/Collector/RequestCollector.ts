import _ from "lodash";
import { getNS, stringifyError } from "../common";
import { loggerFactory } from "../logger";

export abstract class RequestCollector<TKey, TResult> {
  private readonly logger;

  private requestedCalls = 0;
  private actualCalls = 0;
  private timer?: NodeJS.Timeout;

  private pending: {
    [keyStr: string]: { promise: Promise<TResult[]>; index: number } | undefined;
  } = {};
  private waitingEntries: {
    keys: TKey[];
    resolve: (results: TResult[]) => void;
    reject: (err: unknown) => void;
  }[] = [];

  constructor(
    protected readonly label: string,
    private readonly maxBatchSize: number,
    private readonly collectingIntervalMs: number
  ) {
    this.logger = loggerFactory(`request-collector-${label}`);
  }

  private batchSupported = true;

  protected abstract keyToString(key: TKey): string;
  protected abstract fetchBatch(keys: TKey[]): Promise<TResult[]>;

  protected fetchSingle?(key: TKey): Promise<TResult>;
  protected isBatchUnsupportedError?(error: unknown): boolean;

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

  async collectMany(keys: TKey[]) {
    const remaining = keys.filter((k) => !this.pending[this.keyToString(k)]);

    let myPromise: Promise<TResult[]> | undefined;

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

      this.logger.debug(
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

  async collect(key: TKey) {
    const [result] = await this.collectMany([key]);

    return result;
  }

  private async registerCall(keys: TKey[]) {
    const waitingKeysCount = this.waitingEntries.reduce((sum, e) => sum + e.keys.length, 0);

    if (keys.length + waitingKeysCount > this.maxBatchSize) {
      await this.consumeWaitingEntries();
    }

    return await new Promise<TResult[]>((resolve, reject) => {
      this.waitingEntries.push({ keys, resolve, reject });
      this.timer ??= setTimeout(
        () =>
          void this.consumeWaitingEntries().catch((e) =>
            this.logger.error(`consumeWaitingEntries failed: ${stringifyError(e)}`)
          ),
        this.collectingIntervalMs
      );
    });
  }

  private async consumeWaitingEntries() {
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
    }
  }

  private async fetchChunk(keys: TKey[]) {
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

import { Collector } from "../../src";

export type Value = { label: number };

export const MAX = 100;
export const QUICK_FLUSH_MS = 5;
export const SHORT_WINDOW_MS = 50;
export const NEVER_FIRES_WITHIN_TEST_MS = 1000;
export const SLOW_BACKEND_DELAY_MS = 100;
export const HALF_WINDOW_WAIT_MS = 60;

export function makeValue(label: number): Value {
  return { label };
}

export function seedKeys(
  sut: TestRequestCollector,
  prefix: string,
  count: number,
  labelOffset = 0
) {
  const keys = Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
  keys.forEach((k, i) => sut.results.set(k, makeValue(i + 1 + labelOffset)));

  return keys;
}

export class TestRequestCollector extends Collector.RequestCollector<string, Value | null> {
  calls: string[][] = [];
  results = new Map<string, Value | null>();
  delay = 0;
  rejectNext?: Error;

  constructor(maxBatchSize: number, collectingIntervalMs: number) {
    super("test", maxBatchSize, collectingIntervalMs);
  }

  protected override keyToString(key: string) {
    return key;
  }

  protected override async fetchBatch(keys: string[]) {
    this.calls.push([...keys]);

    if (this.rejectNext) {
      const err = this.rejectNext;
      this.rejectNext = undefined;

      throw err;
    }

    const result = keys.map((k) => this.results.get(k) ?? null);

    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    return result;
  }
}

export const BATCH_UNSUPPORTED_MARKER = "batch";

export class FallbackTestRequestCollector extends TestRequestCollector {
  singleCalls: string[] = [];

  protected override fetchSingle(key: string) {
    this.singleCalls.push(key);

    return Promise.resolve(this.results.get(key) ?? null);
  }

  protected override isBatchUnsupportedError(error: unknown) {
    return (error as Error).message.toLowerCase().includes(BATCH_UNSUPPORTED_MARKER);
  }
}

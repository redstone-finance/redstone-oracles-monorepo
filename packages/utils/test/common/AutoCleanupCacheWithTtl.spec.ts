import { AutoCleanupCacheWithTtl } from "../../src/common";

const TTL_MS = 1000;
const CLEANUP_INTERVAL_MS = 400;

describe("AutoCleanupCacheWithTtl", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("prunes expired entries on its interval without a get", () => {
    const cache = new InspectableAutoCleanupCacheWithTtl<string, number>(TTL_MS);

    cache.set("a", 1);
    jest.advanceTimersByTime(TTL_MS);

    expect(cache.keys).toEqual([]);
  });

  it("keeps fresh entries across an interval tick", () => {
    const cache = new InspectableAutoCleanupCacheWithTtl<string, number>(
      TTL_MS,
      CLEANUP_INTERVAL_MS
    );

    cache.set("a", 1);
    jest.advanceTimersByTime(CLEANUP_INTERVAL_MS);

    expect(cache.keys).toEqual(["a"]);
  });
});

class InspectableAutoCleanupCacheWithTtl<K, V> extends AutoCleanupCacheWithTtl<K, V> {
  get keys() {
    return [...this.cache.keys()];
  }
}

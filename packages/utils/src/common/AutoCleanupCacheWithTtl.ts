import { CacheWithTtl } from "./CacheWithTtl";
import { setUnrefInterval } from "./time";

export class AutoCleanupCacheWithTtl<K, V> extends CacheWithTtl<K, V> {
  constructor(ttlMs: number, cleanupIntervalMs = ttlMs) {
    super(ttlMs);

    setUnrefInterval(() => this.clearStale(), cleanupIntervalMs);
  }
}

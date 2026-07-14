import { CacheWithTtl } from "./CacheWithTtl";
import { setUnrefInterval } from "./time";

export class AutoCleanupCacheWithTtl<K, V> extends CacheWithTtl<K, V> {
  constructor(ttlMs: number, cleanupIntervalMs = ttlMs, cleanupHandler?: (k: K, v: V) => void) {
    super(ttlMs, cleanupHandler);

    setUnrefInterval(() => this.clearStale(), cleanupIntervalMs);
  }
}

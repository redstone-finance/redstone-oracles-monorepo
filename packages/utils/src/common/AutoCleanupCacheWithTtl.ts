import { CacheWithTtl } from "./CacheWithTtl";

export class AutoCleanupCacheWithTtl<K, V> extends CacheWithTtl<K, V> {
  constructor(ttlMs: number, cleanupIntervalMs = ttlMs) {
    super(ttlMs);

    setInterval(() => this.clearStale(), cleanupIntervalMs).unref();
  }
}

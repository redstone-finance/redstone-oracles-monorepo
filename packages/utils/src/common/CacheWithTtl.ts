import { isDefined } from "./objects";

export class CacheWithTtl<K, V> {
  protected readonly cache: Map<K, { value: V; setOn: number }>;

  constructor(
    private readonly ttlMs: number,
    private readonly cleanupHandler?: (k: K, v: V) => void
  ) {
    this.cache = new Map();
  }

  get(key: K) {
    const entry = this.cache.get(key);

    if (!isDefined(entry)) {
      return undefined;
    }

    const age = Date.now() - entry.setOn;

    if (age >= this.ttlMs) {
      this.cleanupHandler?.(key, entry.value);
      this.cache.delete(key);

      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V) {
    const setOn = Date.now();

    this.cache.set(key, { value, setOn });
  }

  touch(key: K) {
    const entry = this.cache.get(key);

    if (!isDefined(entry)) {
      return;
    }
    entry.setOn = Date.now();
  }

  clearStale() {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.setOn >= this.ttlMs) {
        this.cleanupHandler?.(key, entry.value);
        this.cache.delete(key);
      }
    }
  }
}

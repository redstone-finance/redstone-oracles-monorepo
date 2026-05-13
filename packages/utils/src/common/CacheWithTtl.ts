import { isDefined } from "./objects";

export class CacheWithTtl<K, V> {
  private readonly cache: Map<K, { value: V; setOn: number }>;

  constructor(private readonly ttlMs: number) {
    this.cache = new Map();
  }

  get(key: K) {
    const entry = this.cache.get(key);

    if (!isDefined(entry)) {
      return undefined;
    }

    const age = Date.now() - entry.setOn;

    if (age >= this.ttlMs) {
      this.cache.delete(key);

      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V) {
    const setOn = Date.now();

    this.cache.set(key, { value, setOn });
  }
}

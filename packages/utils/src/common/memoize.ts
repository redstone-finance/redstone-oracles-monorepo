/* eslint-disable @typescript-eslint/no-unsafe-call */
import { assertWithLog } from "./errors";

type MemoizeCache<T> = { promise: Promise<T>; lastSet: number };
const EXPECTED_MAX_CACHE_ENTRIES_PER_FN = 10_000;
const EXPECTED_MAX_CACHE_KEY_LENGTH_PER_FN = 10_000;

type MemoizeArgs<F extends (...args: unknown[]) => Promise<unknown>> = {
  functionToMemoize: F;
  ttl: number;
  cacheKeyBuilder?: (...args: Parameters<F>) => string | Promise<string>;
};

/**
 * Be default for building cacheKey JSON.stringify function is used, thus order of keys in object matters
 */
export function memoize<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<unknown>,
  R = ReturnType<F>,
>({
  functionToMemoize,
  ttl,
  cacheKeyBuilder = (...args: unknown[]) => JSON.stringify(args),
}: MemoizeArgs<F>): F {
  const cache: Partial<Record<string, MemoizeCache<R>>> = {};

  return (async (...args: Parameters<F>) => {
    const cacheKey = await cacheKeyBuilder(...args);

    assertWithLog(
      cacheKey.length < EXPECTED_MAX_CACHE_KEY_LENGTH_PER_FN,
      `Assumed cache key will not be longer than ${EXPECTED_MAX_CACHE_KEY_LENGTH_PER_FN}. Suspicious key ${cacheKey}`
    );

    // to avoid caching results forever
    cleanStaleCacheEntries(cache, ttl);

    // we don't check ttl because it is cleared here: cleanStaleCacheEntries
    if (!cache[cacheKey] || Date.now() - cache[cacheKey]!.lastSet > ttl) {
      cache[cacheKey] = {
        lastSet: Date.now(),
        promise: functionToMemoize(...args).catch((err: unknown) => {
          // don't propagate cache when promise resolves to error
          delete cache[cacheKey];
          throw err;
        }) as Promise<R>,
      };
    }
    return await cache[cacheKey]!.promise;
  }) as F;
}

const cleanStaleCacheEntries = <T>(
  cache: Partial<Record<string, MemoizeCache<T>>>,
  ttl: number
) => {
  const now = Date.now();
  const cacheKeys = Object.keys(cache);

  // we want to avoid slowing down
  assertWithLog(
    cacheKeys.length < EXPECTED_MAX_CACHE_ENTRIES_PER_FN,
    `Assumed cache key space will not grow over ${EXPECTED_MAX_CACHE_ENTRIES_PER_FN} but is ${cacheKeys.length}`
  );

  // to avoid trigerring gc too often
  if (cacheKeys.length > 1_000) {
    for (const key of cacheKeys) {
      if (now - cache[key]!.lastSet > ttl) {
        delete cache[key];
      }
    }
  }
};

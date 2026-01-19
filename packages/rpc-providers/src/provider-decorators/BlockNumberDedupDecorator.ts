import { providers } from "ethers";

/**
 * Decorator that deduplicates concurrent `getBlockNumber()` calls on a provider.
 *
 * When multiple callers request the block number simultaneously, only one actual
 * RPC call is made - all callers share the same in-flight promise.
 *
 * NOTE: This decorator is NOT enabled by default in MegaProviderBuilder.
 * The solo providers (RedstoneEthers5Provider) already have block number caching
 * via TTL-based memoization. Enabling this decorator on top of that would result
 * in double caching, which is typically unnecessary.
 *
 * Use this decorator only if:
 * - Your solo providers don't have block number caching enabled, OR
 * - You need in-flight deduplication specifically (different from TTL caching)
 */
export function BlockNumberDedupDecorator(factory: () => providers.Provider) {
  return () => {
    const provider = factory();

    let runningPromise: Promise<number> | undefined;

    const oldGetBlockNumber = provider.getBlockNumber.bind(provider);

    provider.getBlockNumber = async () => {
      if (runningPromise) {
        return await runningPromise; // reuse in-flight request
      }
      runningPromise = oldGetBlockNumber();

      try {
        return await runningPromise;
      } finally {
        runningPromise = undefined;
      }
    };
    return provider;
  };
}

import { RedstoneCommon } from "@redstone-finance/utils";
import { GetAccountsInfoRequestCollector } from "../src/GetAccountsInfoRequestCollector";
import { makeAccountInfo, makePublicKey, MockDelegate } from "./test-helpers";

function setUp(collectingIntervalMs = 10) {
  const collector = new GetAccountsInfoRequestCollector(collectingIntervalMs);
  const delegate = new MockDelegate();
  collector.delegate = new WeakRef(delegate);

  return { collector, delegate };
}

describe("GetAccountsInfoRequestCollector", () => {
  describe("basic functionality", () => {
    it("should fetch a single key", async () => {
      const { collector, delegate } = setUp();
      const key = makePublicKey(1);
      const info = makeAccountInfo(1);
      delegate.results.set(key.toBase58(), info);

      const result = await collector.getMultipleAccountInfoCollected([key]);

      expect(result).toEqual([info]);
      expect(delegate.calls).toHaveLength(1);
      expect(delegate.calls[0]).toHaveLength(1);
    });

    it("should fetch multiple keys in one call", async () => {
      const { collector, delegate } = setUp();
      const keys = [makePublicKey(1), makePublicKey(2), makePublicKey(3)];
      keys.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 1)));

      const result = await collector.getMultipleAccountInfoCollected(keys);

      expect(result).toHaveLength(3);
      expect(result[0]!.lamports).toBe(1);
      expect(result[1]!.lamports).toBe(2);
      expect(result[2]!.lamports).toBe(3);
      expect(delegate.calls).toHaveLength(1);
    });

    it("should return null for missing accounts", async () => {
      const { collector } = setUp();
      const keys = [makePublicKey(1)];

      const result = await collector.getMultipleAccountInfoCollected(keys);

      expect(result).toEqual([null]);
    });
  });

  describe("batching / collecting behavior", () => {
    it("should batch concurrent requests into a single RPC call", async () => {
      const { collector, delegate } = setUp(50);
      const key1 = makePublicKey(1);
      const key2 = makePublicKey(2);
      delegate.results.set(key1.toBase58(), makeAccountInfo(1));
      delegate.results.set(key2.toBase58(), makeAccountInfo(2));

      const [result1, result2] = await Promise.all([
        collector.getMultipleAccountInfoCollected([key1]),
        collector.getMultipleAccountInfoCollected([key2]),
      ]);

      expect(result1).toEqual([makeAccountInfo(1)]);
      expect(result2).toEqual([makeAccountInfo(2)]);
      expect(delegate.calls).toHaveLength(1);
      expect(delegate.calls[0]).toHaveLength(2);
    });

    it("should make separate calls for sequential requests (after timer fires)", async () => {
      const { collector, delegate } = setUp(5);
      const key1 = makePublicKey(1);
      const key2 = makePublicKey(2);
      delegate.results.set(key1.toBase58(), makeAccountInfo(1));
      delegate.results.set(key2.toBase58(), makeAccountInfo(2));

      await collector.getMultipleAccountInfoCollected([key1]);
      await collector.getMultipleAccountInfoCollected([key2]);

      expect(delegate.calls).toHaveLength(2);
    });
  });

  describe("MAX_NUMBER_OF_ACCOUNTS_TO_FETCH limit", () => {
    it("should flush first batch when total keys exceed 100", async () => {
      const { collector, delegate } = setUp(1000);

      const keys1 = Array.from({ length: 60 }, (_, i) => makePublicKey(i + 1));
      keys1.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 1)));

      const keys2 = Array.from({ length: 50 }, (_, i) => makePublicKey(i + 100));
      keys2.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 100)));

      const [result1, result2] = await Promise.all([
        collector.getMultipleAccountInfoCollected(keys1),
        collector.getMultipleAccountInfoCollected(keys2),
      ]);

      expect(result1).toHaveLength(60);
      expect(result2).toHaveLength(50);
      // Should split into 2 calls since 60+50=110 > 100
      expect(delegate.calls).toHaveLength(2);
      expect(delegate.calls[0]).toHaveLength(60);
      expect(delegate.calls[1]).toHaveLength(50);
    });

    it("should split multiple batches that exceed 100 keys", async () => {
      const { collector, delegate } = setUp(1000);

      const keys1 = Array.from({ length: 90 }, (_, i) => makePublicKey(i + 1));
      keys1.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 1)));

      const keys2 = Array.from({ length: 90 }, (_, i) => makePublicKey(i + 100));
      keys2.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 100)));

      const keys3 = Array.from({ length: 90 }, (_, i) => makePublicKey(i + 200));
      keys3.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 200)));

      const [r1, r2, r3] = await Promise.all([
        collector.getMultipleAccountInfoCollected(keys1),
        collector.getMultipleAccountInfoCollected(keys2),
        collector.getMultipleAccountInfoCollected(keys3),
      ]);

      expect(r1).toHaveLength(90);
      expect(r2).toHaveLength(90);
      expect(r3).toHaveLength(90);
      // Each batch of 90 exceeds 100 when combined, so should be multiple calls
      expect(delegate.calls.length).toBeGreaterThanOrEqual(2);
      // No single call should exceed 100 keys
      for (const call of delegate.calls) {
        expect(call.length).toBeLessThanOrEqual(100);
      }
    });

    it("should correctly count keys (not groups) for the overflow check", async () => {
      const { collector, delegate } = setUp(1000);

      // 99 individual single-key requests = 99 keys in 99 groups
      const singleKeyPromises = Array.from({ length: 99 }, (_, i) => {
        const key = makePublicKey(i + 1);
        delegate.results.set(key.toBase58(), makeAccountInfo(i + 1));
        return collector.getMultipleAccountInfoCollected([key]);
      });

      // 10-key batch: total = 109 keys > 100, should trigger flush
      const batchKeys = Array.from({ length: 10 }, (_, i) => makePublicKey(i + 200));
      batchKeys.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 200)));
      const batchPromise = collector.getMultipleAccountInfoCollected(batchKeys);

      const results = await Promise.all([...singleKeyPromises, batchPromise]);
      expect(results).toHaveLength(100);
      expect(delegate.calls.length).toBeGreaterThanOrEqual(2);
      for (const call of delegate.calls) {
        expect(call.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("error handling", () => {
    it("should reject when delegate is not set", async () => {
      const collector = new GetAccountsInfoRequestCollector(5);

      await expect(collector.getMultipleAccountInfoCollected([makePublicKey(1)])).rejects.toThrow(
        "Connection not set"
      );
    });

    it("should propagate delegate errors to all waiting callers", async () => {
      const { collector, delegate } = setUp(50);
      delegate.rejectNext = new Error("RPC error");

      const key1 = makePublicKey(1);
      const key2 = makePublicKey(2);

      const promise1 = collector.getMultipleAccountInfoCollected([key1]);
      const promise2 = collector.getMultipleAccountInfoCollected([key2]);

      await expect(promise1).rejects.toThrow("RPC error");
      await expect(promise2).rejects.toThrow("RPC error");
    });

    it("should recover after an error and handle next batch", async () => {
      const { collector, delegate } = setUp(5);
      const key1 = makePublicKey(1);
      delegate.results.set(key1.toBase58(), makeAccountInfo(1));

      delegate.rejectNext = new Error("Transient error");
      await expect(collector.getMultipleAccountInfoCollected([key1])).rejects.toThrow(
        "Transient error"
      );

      const result = await collector.getMultipleAccountInfoCollected([key1]);
      expect(result).toEqual([makeAccountInfo(1)]);
    });

    it("should reject all callers when one chunk fails in a multi-chunk batch", async () => {
      const { collector, delegate } = setUp(1000);

      // 60 keys in first group, 60 in second → 120 total → 2 chunks of 100+20
      const keys1 = Array.from({ length: 60 }, (_, i) => makePublicKey(i + 1));
      keys1.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 1)));

      const keys2 = Array.from({ length: 60 }, (_, i) => makePublicKey(i + 100));
      keys2.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 100)));

      // First call adds 60 keys → flush triggered by second call (60+60>100)
      // After flush, second call's 60 keys go into timer batch
      // We make the delegate fail on the second RPC call
      let callCount = 0;
      const originalFn =
        delegate.getAccountsInfoRequestCollectorGetMultipleAccountsInfo.bind(delegate);
      delegate.getAccountsInfoRequestCollectorGetMultipleAccountsInfo = (publicKeys, config) => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Chunk 2 failed"));
        }

        return originalFn(publicKeys, config);
      };

      const promise1 = collector.getMultipleAccountInfoCollected(keys1);
      const promise2 = collector.getMultipleAccountInfoCollected(keys2);

      // First group resolves (flushed before second group arrives)
      const result1 = await promise1;
      expect(result1).toHaveLength(60);

      // Second group rejects
      await expect(promise2).rejects.toThrow("Chunk 2 failed");
    });

    it("should reject callers when error occurs during overflow flush", async () => {
      const { collector, delegate } = setUp(1000);

      const keys1 = Array.from({ length: 60 }, (_, i) => makePublicKey(i + 1));
      keys1.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 1)));

      const keys2 = Array.from({ length: 60 }, (_, i) => makePublicKey(i + 100));
      keys2.forEach((k, i) => delegate.results.set(k.toBase58(), makeAccountInfo(i + 100)));

      delegate.rejectNext = new Error("Overflow flush failed");

      const promise1 = collector.getMultipleAccountInfoCollected(keys1);
      const promise2 = collector.getMultipleAccountInfoCollected(keys2);

      // First group was flushed and failed
      await expect(promise1).rejects.toThrow("Overflow flush failed");

      // Second group goes through timer — should succeed since rejectNext is cleared
      const result2 = await promise2;
      expect(result2).toHaveLength(60);
    });
  });

  describe("pending deduplication", () => {
    it("should reuse pending promise for already-requested keys", async () => {
      const { collector, delegate } = setUp(50);
      delegate.delay = 100;

      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      const promise1 = collector.getMultipleAccountInfoCollected([key]);

      await RedstoneCommon.sleep(60);

      const promise2 = collector.getMultipleAccountInfoCollected([key]);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual([makeAccountInfo(1)]);
      expect(result2).toEqual([makeAccountInfo(1)]);
    });

    it("should only register remaining (non-pending) keys for new calls", async () => {
      const { collector, delegate } = setUp(50);
      delegate.delay = 100;

      const key1 = makePublicKey(1);
      const key2 = makePublicKey(2);
      const key3 = makePublicKey(3);
      delegate.results.set(key1.toBase58(), makeAccountInfo(1));
      delegate.results.set(key2.toBase58(), makeAccountInfo(2));
      delegate.results.set(key3.toBase58(), makeAccountInfo(3));

      // First call requests key1 and key2
      const promise1 = collector.getMultipleAccountInfoCollected([key1, key2]);

      await RedstoneCommon.sleep(60);

      // Second call requests key2 (pending) and key3 (new)
      // Should only register key3 in the new batch
      const promise2 = collector.getMultipleAccountInfoCollected([key2, key3]);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual([makeAccountInfo(1), makeAccountInfo(2)]);
      expect(result2).toEqual([makeAccountInfo(2), makeAccountInfo(3)]);

      // First call: [key1, key2], second call: [key3] only (key2 was pending)
      expect(delegate.calls).toHaveLength(2);
      expect(delegate.calls[0]).toHaveLength(2);
      expect(delegate.calls[1]).toHaveLength(1);
    });
  });

  describe("cleanup after resolution", () => {
    it("should clean up pending entries after promise resolves", async () => {
      const { collector, delegate } = setUp(5);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      await collector.getMultipleAccountInfoCollected([key]);
      await collector.getMultipleAccountInfoCollected([key]);

      expect(delegate.calls).toHaveLength(2);
    });
  });

  describe("dispose", () => {
    it("should clear the timer on dispose", async () => {
      const { collector, delegate } = setUp(5000);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      // Start a request that will set a timer
      const promise = collector.getMultipleAccountInfoCollected([key]);

      // Dispose before the timer fires — promise will hang, but no timer leak
      collector.dispose();

      // The promise won't resolve since we disposed, so race it
      const result = RedstoneCommon.timeout(promise, 100, "timeout");

      await expect(result).rejects.toThrowError("GetAccountsInfoRequestCollector disposed");
    });
  });
});

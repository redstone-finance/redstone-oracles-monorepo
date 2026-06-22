import { RedstoneCommon } from "../../src";
import {
  FallbackTestRequestCollector,
  HALF_WINDOW_WAIT_MS,
  IdleTrackingTestRequestCollector,
  makeValue,
  MAX,
  NEVER_FIRES_WITHIN_TEST_MS,
  QUICK_FLUSH_MS,
  seedKeys,
  SHORT_WINDOW_MS,
  SLOW_BACKEND_DELAY_MS,
  TestRequestCollector,
} from "./test-helpers";

function setUp(maxBatchSize = MAX, collectingIntervalMs = QUICK_FLUSH_MS * 2) {
  return new TestRequestCollector(maxBatchSize, collectingIntervalMs);
}

function setUpWithFallback(maxBatchSize = MAX, collectingIntervalMs = QUICK_FLUSH_MS) {
  return new FallbackTestRequestCollector(maxBatchSize, collectingIntervalMs);
}

describe("RequestCollector", () => {
  describe("basic functionality", () => {
    it("fetches a single key and forwards it to fetchBatch as one call", async () => {
      const sut = setUp();
      sut.results.set("k1", makeValue(1));

      const result = await sut.collectMany(["k1"]);

      expect(result).toEqual([makeValue(1)]);
      expect(sut.calls).toEqual([["k1"]]);
    });

    it("fetches multiple keys in one call", async () => {
      const sut = setUp();
      ["k1", "k2", "k3"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      const result = await sut.collectMany(["k1", "k2", "k3"]);

      expect(result).toEqual([makeValue(1), makeValue(2), makeValue(3)]);
      expect(sut.calls).toEqual([["k1", "k2", "k3"]]);
    });

    it("returns null for missing entries", async () => {
      const sut = setUp();

      const result = await sut.collectMany(["k1"]);

      expect(result).toEqual([null]);
    });

    it("collect() returns a single value", async () => {
      const sut = setUp();
      sut.results.set("k1", makeValue(1));

      const result = await sut.collect("k1");

      expect(result).toEqual(makeValue(1));
    });
  });

  describe("batching / collecting behavior", () => {
    it("batches concurrent requests into a single underlying call", async () => {
      const sut = setUp(MAX, SHORT_WINDOW_MS);
      ["k1", "k2"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      const [r1, r2] = await Promise.all([sut.collectMany(["k1"]), sut.collectMany(["k2"])]);

      expect(r1).toEqual([makeValue(1)]);
      expect(r2).toEqual([makeValue(2)]);
      expect(sut.calls).toEqual([["k1", "k2"]]);
    });

    it("makes separate calls for sequential requests after timer fires", async () => {
      const sut = setUp(MAX, QUICK_FLUSH_MS);
      ["k1", "k2"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      await sut.collectMany(["k1"]);
      await sut.collectMany(["k2"]);

      expect(sut.calls).toEqual([["k1"], ["k2"]]);
    });
  });

  describe("maxBatchSize limit", () => {
    it("flushes a batch immediately when adding new keys would overflow the limit", async () => {
      const sut = setUp(MAX, NEVER_FIRES_WITHIN_TEST_MS);
      const keys1 = seedKeys(sut, "k1", 60);
      const keys2 = seedKeys(sut, "k2", 50, 100);

      const [r1, r2] = await Promise.all([sut.collectMany(keys1), sut.collectMany(keys2)]);

      expect(r1).toEqual(keys1.map((_, i) => makeValue(i + 1)));
      expect(r2).toEqual(keys2.map((_, i) => makeValue(i + 1 + 100)));
      expect(sut.calls).toEqual([keys1, keys2]);
    });

    it("chunks within fetchBatch when one batch alone exceeds the limit", async () => {
      const sut = setUp(MAX, NEVER_FIRES_WITHIN_TEST_MS);
      const overflowing = seedKeys(sut, "k", MAX + 50);

      const result = await sut.collectMany(overflowing);

      expect(result).toEqual(overflowing.map((_, i) => makeValue(i + 1)));
      const flat = sut.calls.flat();
      expect(flat).toEqual(overflowing);
      expect(sut.calls.every((c) => c.length <= MAX)).toBe(true);
      expect(sut.calls.length).toBe(2);
    });

    it("counts keys (not groups) for the overflow check", async () => {
      const sut = setUp(MAX, NEVER_FIRES_WITHIN_TEST_MS);
      const singleKeys = seedKeys(sut, "single", 99);
      const batchKeys = seedKeys(sut, "batch", 10, 200);

      const results = await Promise.all([
        ...singleKeys.map((k) => sut.collectMany([k])),
        sut.collectMany(batchKeys),
      ]);

      expect(results.flat()).toHaveLength(singleKeys.length + batchKeys.length);
      const flat = sut.calls.flat().sort();
      expect(flat).toEqual([...singleKeys, ...batchKeys].sort());
      expect(sut.calls.every((c) => c.length <= MAX)).toBe(true);
    });
  });

  describe("error handling", () => {
    it("propagates errors to all waiting callers in the same flush", async () => {
      const sut = setUp(MAX, SHORT_WINDOW_MS);
      sut.rejectNext = new Error("backend error");

      const promise1 = sut.collectMany(["k1"]);
      const promise2 = sut.collectMany(["k2"]);

      await expect(promise1).rejects.toThrow("backend error");
      await expect(promise2).rejects.toThrow("backend error");
      expect(sut.calls).toEqual([["k1", "k2"]]);
    });

    it("recovers after an error and handles the next batch", async () => {
      const sut = setUp(MAX, QUICK_FLUSH_MS);
      sut.results.set("k1", makeValue(1));

      sut.rejectNext = new Error("transient");
      await expect(sut.collectMany(["k1"])).rejects.toThrow("transient");

      const result = await sut.collectMany(["k1"]);

      expect(result).toEqual([makeValue(1)]);
      expect(sut.calls).toEqual([["k1"], ["k1"]]);
    });

    it("rejects callers when error occurs during overflow flush", async () => {
      const sut = setUp(MAX, NEVER_FIRES_WITHIN_TEST_MS);
      const keys1 = seedKeys(sut, "k1", 60);
      const keys2 = seedKeys(sut, "k2", 60, 100);

      sut.rejectNext = new Error("flush failed");

      const promise1 = sut.collectMany(keys1);
      const promise2 = sut.collectMany(keys2);

      await expect(promise1).rejects.toThrow("flush failed");
      const result2 = await promise2;
      expect(result2).toEqual(keys2.map((_, i) => makeValue(i + 1 + 100)));
      expect(sut.calls).toEqual([keys1, keys2]);
    });
  });

  describe("pending deduplication", () => {
    it("reuses pending promise for already-requested keys", async () => {
      const sut = setUp(MAX, SHORT_WINDOW_MS);
      sut.delay = SLOW_BACKEND_DELAY_MS;
      sut.results.set("k1", makeValue(1));

      const promise1 = sut.collectMany(["k1"]);
      await RedstoneCommon.sleep(HALF_WINDOW_WAIT_MS);
      const promise2 = sut.collectMany(["k1"]);

      const [r1, r2] = await Promise.all([promise1, promise2]);

      expect(r1).toEqual([makeValue(1)]);
      expect(r2).toEqual([makeValue(1)]);
      expect(sut.calls).toEqual([["k1"]]);
    });

    it("only registers non-pending keys for new calls (in-flight pending key skipped)", async () => {
      const sut = setUp(MAX, SHORT_WINDOW_MS);
      sut.delay = SLOW_BACKEND_DELAY_MS;
      ["k1", "k2", "k3"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      const promise1 = sut.collectMany(["k1", "k2"]);
      await RedstoneCommon.sleep(HALF_WINDOW_WAIT_MS);
      const promise2 = sut.collectMany(["k2", "k3"]);

      const [r1, r2] = await Promise.all([promise1, promise2]);

      expect(r1).toEqual([makeValue(1), makeValue(2)]);
      expect(r2).toEqual([makeValue(2), makeValue(3)]);
      expect(sut.calls).toEqual([["k1", "k2"], ["k3"]]);
    });
  });

  describe("cleanup after resolution", () => {
    it("clears pending entries so the next call re-fetches", async () => {
      const sut = setUp(MAX, QUICK_FLUSH_MS);
      sut.results.set("k1", makeValue(1));

      await sut.collectMany(["k1"]);
      await sut.collectMany(["k1"]);

      expect(sut.calls).toEqual([["k1"], ["k1"]]);
    });
  });

  describe("dispose", () => {
    it("clears the timer and rejects pending callers", async () => {
      const sut = setUp(MAX, 5000);
      sut.results.set("k1", makeValue(1));

      const promise = sut.collectMany(["k1"]);

      sut.dispose();

      const result = RedstoneCommon.timeout(promise, 100, "timeout");
      await expect(result).rejects.toThrow("TestRequestCollector disposed");
    });
  });

  describe("onIdle hook", () => {
    it("fires once after a batch resolves", async () => {
      const sut = new IdleTrackingTestRequestCollector(MAX, QUICK_FLUSH_MS);
      sut.results.set("k1", makeValue(1));

      await sut.collectMany(["k1"]);

      expect(sut.idleCount).toBe(1);
    });

    it("fires once per flush even when the batch overflows into multiple chunks", async () => {
      const sut = new IdleTrackingTestRequestCollector(MAX, NEVER_FIRES_WITHIN_TEST_MS);
      const overflowing = seedKeys(sut, "k", MAX + 50);

      await sut.collectMany(overflowing);

      expect(sut.calls.length).toBe(2);
      expect(sut.idleCount).toBe(1);
    });

    it("fires onIdle once when two consume calls overlap concurrently", async () => {
      const sut = new IdleTrackingTestRequestCollector(MAX, QUICK_FLUSH_MS);
      sut.delay = SLOW_BACKEND_DELAY_MS;
      sut.results.set("a", makeValue(1));
      sut.results.set("b", makeValue(2));

      const promiseA = sut.collectMany(["a"]);
      await RedstoneCommon.sleep(QUICK_FLUSH_MS * 2);
      const promiseB = sut.collectMany(["b"]);
      await RedstoneCommon.sleep(QUICK_FLUSH_MS * 2);

      await Promise.all([promiseA, promiseB]);

      expect(sut.calls).toEqual([["a"], ["b"]]);
      expect(sut.idleCount).toBe(1);
    });

    it("does not fire onIdle between an overflow flush and the subsequent push", async () => {
      const sut = new IdleTrackingTestRequestCollector(MAX, QUICK_FLUSH_MS);
      const keys1 = seedKeys(sut, "k1", 60);
      const keys2 = seedKeys(sut, "k2", 50, 100);

      await Promise.all([sut.collectMany(keys1), sut.collectMany(keys2)]);

      expect(sut.idleCount).toBe(1);
    });
  });

  describe("batch-unsupported fallback (fetchSingle)", () => {
    it("uses fetchSingle for a single key and skips the batch call", async () => {
      const sut = setUpWithFallback();
      sut.results.set("k1", makeValue(1));

      const result = await sut.collectMany(["k1"]);

      expect(result).toEqual([makeValue(1)]);
      expect(sut.calls).toEqual([]);
      expect(sut.singleCalls).toEqual(["k1"]);
    });

    it("still batches multiple keys while batching is supported", async () => {
      const sut = setUpWithFallback(MAX, SHORT_WINDOW_MS);
      ["k1", "k2"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      const [r1, r2] = await Promise.all([sut.collectMany(["k1"]), sut.collectMany(["k2"])]);

      expect(r1).toEqual([makeValue(1)]);
      expect(r2).toEqual([makeValue(2)]);
      expect(sut.calls).toEqual([["k1", "k2"]]);
      expect(sut.singleCalls).toEqual([]);
    });

    it("falls back to individual requests on a batch-unsupported error and stays on singles", async () => {
      const sut = setUpWithFallback(MAX, SHORT_WINDOW_MS);
      ["k1", "k2", "k3", "k4"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      sut.rejectNext = new Error("Batch calls are available for paid plans only");

      const [r1, r2] = await Promise.all([sut.collectMany(["k1"]), sut.collectMany(["k2"])]);

      expect(r1).toEqual([makeValue(1)]);
      expect(r2).toEqual([makeValue(2)]);
      expect(sut.calls).toEqual([["k1", "k2"]]);
      expect(sut.singleCalls).toEqual(["k1", "k2"]);

      const [r3, r4] = await Promise.all([sut.collectMany(["k3"]), sut.collectMany(["k4"])]);

      expect(r3).toEqual([makeValue(3)]);
      expect(r4).toEqual([makeValue(4)]);
      expect(sut.calls).toEqual([["k1", "k2"]]);
      expect(sut.singleCalls).toEqual(["k1", "k2", "k3", "k4"]);
    });

    it("rethrows non-batch errors without falling back and keeps batching enabled", async () => {
      const sut = setUpWithFallback(MAX, SHORT_WINDOW_MS);
      ["k1", "k2"].forEach((k, i) => sut.results.set(k, makeValue(i + 1)));

      sut.rejectNext = new Error("429 Too Many Requests");

      await expect(Promise.all([sut.collectMany(["k1"]), sut.collectMany(["k2"])])).rejects.toThrow(
        "429 Too Many Requests"
      );
      expect(sut.singleCalls).toEqual([]);

      const result = await sut.collectMany(["k1", "k2"]);

      expect(result).toEqual([makeValue(1), makeValue(2)]);
      expect(sut.calls).toEqual([
        ["k1", "k2"],
        ["k1", "k2"],
      ]);
      expect(sut.singleCalls).toEqual([]);
    });
  });
});

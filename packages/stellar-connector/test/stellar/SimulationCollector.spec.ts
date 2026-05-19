import { RedstoneCommon } from "@redstone-finance/utils";
import { SimulationCollector } from "../../src/stellar/SimulationCollector";
import {
  FakeDelegate,
  FakeRouter,
  makeKey,
  MAX_NUMBER_OF_CALLS,
  NEVER_FIRES_WITHIN_TEST_MS,
  QUICK_FLUSH_MS,
  RPC_URL,
} from "./test-helpers";

function setUp(
  blockNumber: number | undefined,
  collectingIntervalMs = QUICK_FLUSH_MS,
  withDelegate = true
) {
  const router = new FakeRouter();
  const delegate = new FakeDelegate();
  const sut = new SimulationCollector(
    router.asSdk(),
    () => (withDelegate ? delegate : undefined),
    RPC_URL,
    blockNumber,
    collectingIntervalMs
  );

  return { sut, router, delegate };
}

describe("SimulationCollector", () => {
  describe("single-call fast path via delegate", () => {
    it("routes a single invocation through delegate.simulateInvocation (not the router)", async () => {
      const { sut, router, delegate } = setUp(42);

      const result = await sut.collect(makeKey("foo"));

      expect(result).toBe("delegate:foo@42");
      expect(delegate.simulateInvocationCalls).toEqual([{ method: "foo", block: 42 }]);
      expect(router.simResultCalls).toEqual([]);
    });

    it("forwards the constructor's blockNumber to delegate.simulateInvocation", async () => {
      const { sut, delegate } = setUp(7);

      await sut.collect(makeKey("foo"));

      expect(delegate.simulateInvocationCalls[0].block).toBe(7);
    });

    it("preflights waitForBlockNumber with the constructor's blockNumber", async () => {
      const { sut, delegate } = setUp(13);

      await sut.collect(makeKey("foo"));

      expect(delegate.waitForBlockNumberCalls).toEqual([13]);
    });

    it("falls back to router.simResult when no delegate is set", async () => {
      const { sut, router } = setUp(7, QUICK_FLUSH_MS, false);

      const result = await sut.collect(makeKey("foo"));

      expect(result).toBe("router:foo");
      expect(router.simResultCalls).toEqual([{ invocations: 1, ids: ["foo"] }]);
    });
  });

  describe("multi-call batching via router", () => {
    it("batches concurrent distinct calls into one router.simResult", async () => {
      const { sut, router, delegate } = setUp(7, NEVER_FIRES_WITHIN_TEST_MS);

      const [r1, r2] = await Promise.all([
        sut.collect(makeKey("foo")),
        sut.collect(makeKey("bar")),
      ]);

      expect(r1).toBe("router:foo");
      expect(r2).toBe("router:bar");
      expect(router.simResultCalls).toEqual([{ invocations: 2, ids: ["foo", "bar"] }]);
      expect(delegate.simulateInvocationCalls).toEqual([]);
    });

    it("deduplicates concurrent calls with identical contract+method+args", async () => {
      const { sut, router, delegate } = setUp(7, NEVER_FIRES_WITHIN_TEST_MS);

      const [r1, r2] = await Promise.all([
        sut.collect(makeKey("foo", 1)),
        sut.collect(makeKey("foo", 1)),
      ]);

      expect(r1).toBe("delegate:foo@7");
      expect(r2).toBe("delegate:foo@7");
      expect(router.simResultCalls).toEqual([]);
      expect(delegate.simulateInvocationCalls).toEqual([{ method: "foo", block: 7 }]);
    });

    it("does NOT deduplicate calls that differ only in args", async () => {
      const { sut, router } = setUp(7, NEVER_FIRES_WITHIN_TEST_MS);

      await Promise.all([sut.collect(makeKey("foo", 1)), sut.collect(makeKey("foo", 2))]);

      expect(router.simResultCalls).toEqual([{ invocations: 2, ids: ["foo", "foo"] }]);
    });

    it("chunks at MAX_NUMBER_OF_CALLS", async () => {
      const { sut, router } = setUp(7, NEVER_FIRES_WITHIN_TEST_MS);
      const count = MAX_NUMBER_OF_CALLS + 5;

      await Promise.all(Array.from({ length: count }, (_, i) => sut.collect(makeKey("m", i))));

      expect(router.simResultCalls.length).toBeGreaterThanOrEqual(2);
      for (const call of router.simResultCalls) {
        expect(call.invocations).toBeLessThanOrEqual(MAX_NUMBER_OF_CALLS);
      }
    });

    it("preflights waitForBlockNumber with the constructor's blockNumber for the multi-call batch", async () => {
      const { sut, delegate } = setUp(99, NEVER_FIRES_WITHIN_TEST_MS);

      await Promise.all([sut.collect(makeKey("a")), sut.collect(makeKey("b"))]);

      expect(delegate.waitForBlockNumberCalls).toEqual([99]);
    });
  });

  describe("dispose", () => {
    it("rejects pending callers with `SimulationCollector disposed`", async () => {
      const { sut } = setUp(7, 5000);
      const promise = sut.collect(makeKey("foo"));

      sut.dispose();

      const racedResult = RedstoneCommon.timeout(promise, 100, "timeout");
      await expect(racedResult).rejects.toThrowError("SimulationCollector disposed");
    });
  });
});

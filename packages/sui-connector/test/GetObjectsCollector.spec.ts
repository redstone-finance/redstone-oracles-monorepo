import type { SuiClientTypes } from "@mysten/sui/client";
import { RedstoneCommon } from "@redstone-finance/utils";
import { GetObjectsCollector } from "../src/client/GetObjectsCollector";
import {
  arrayOfIds,
  CUSTOM_INCLUDE,
  DEFAULT_INCLUDE,
  FakeCore,
  HALF_WINDOW_WAIT_MS,
  makeFakeObject,
  NEVER_FIRES_WITHIN_TEST_MS,
  OVERFLOW_BATCH_COUNT,
  QUICK_FLUSH_MS,
  SHORT_WINDOW_MS,
  SLOW_RPC_DELAY_MS,
  SUI_MULTI_GET_OBJECTS_MAX,
} from "./test-helpers";

function setUp(
  collectingIntervalMs = QUICK_FLUSH_MS,
  maxBatchSize = SUI_MULTI_GET_OBJECTS_MAX,
  include: SuiClientTypes.ObjectInclude = DEFAULT_INCLUDE
) {
  const core = new FakeCore();
  const sut = new GetObjectsCollector(core, include, collectingIntervalMs, maxBatchSize);

  return { sut, core };
}

describe("GetObjectsCollector", () => {
  it("fetches a single object", async () => {
    const { sut, core } = setUp();
    core.populate(["a"]);

    const [result] = await sut.collectMany(["a"]);

    expect(result).toEqual(makeFakeObject("a"));
    expect(core.calls).toEqual([{ objectIds: ["a"], include: DEFAULT_INCLUDE }]);
  });

  it("forwards the configured include to core.getObjects", async () => {
    const { sut, core } = setUp(QUICK_FLUSH_MS, SUI_MULTI_GET_OBJECTS_MAX, CUSTOM_INCLUDE);
    core.populate(["a"]);

    await sut.collectMany(["a"]);

    expect(core.calls[0].include).toEqual(CUSTOM_INCLUDE);
  });

  it("returns Error sentinels from the underlying call as-is (no throw)", async () => {
    const { sut, core } = setUp();
    core.populate(["ok"]);

    const [okObj, missingObj] = await sut.collectMany(["ok", "missing"]);

    expect(okObj).toEqual(makeFakeObject("ok"));
    expect(missingObj).toBeInstanceOf(Error);
    expect((missingObj as Error).message).toContain("missing");
  });

  it("batches concurrent calls into a single multiGetObjects RPC", async () => {
    const { sut, core } = setUp(SHORT_WINDOW_MS);
    core.populate(["a", "b"]);

    const [r1, r2] = await Promise.all([sut.collectMany(["a"]), sut.collectMany(["b"])]);

    expect(r1).toEqual([makeFakeObject("a")]);
    expect(r2).toEqual([makeFakeObject("b")]);
    expect(core.calls).toHaveLength(1);
    expect(core.calls[0].objectIds).toEqual(["a", "b"]);
  });

  it("chunks at the Sui multiGetObjects limit", async () => {
    const { sut, core } = setUp(NEVER_FIRES_WITHIN_TEST_MS);
    const ids = core.populate(arrayOfIds("o", OVERFLOW_BATCH_COUNT));

    const result = await sut.collectMany(ids);

    expect(result).toHaveLength(OVERFLOW_BATCH_COUNT);
    expect(core.calls.length).toBeGreaterThanOrEqual(2);
    for (const call of core.calls) {
      expect(call.objectIds.length).toBeLessThanOrEqual(SUI_MULTI_GET_OBJECTS_MAX);
    }
  });

  it("deduplicates concurrent in-flight requests by objectId", async () => {
    const { sut, core } = setUp(SHORT_WINDOW_MS);
    core.delay = SLOW_RPC_DELAY_MS;
    core.populate(["a", "b"]);

    const promise1 = sut.collectMany(["a"]);

    await RedstoneCommon.sleep(HALF_WINDOW_WAIT_MS);

    const promise2 = sut.collectMany(["a", "b"]);

    const [r1, r2] = await Promise.all([promise1, promise2]);

    expect(r1).toEqual([makeFakeObject("a")]);
    expect(r2).toEqual([makeFakeObject("a"), makeFakeObject("b")]);
    expect(core.calls).toHaveLength(2);
    expect(core.calls[0].objectIds).toEqual(["a"]);
    expect(core.calls[1].objectIds).toEqual(["b"]);
  });

  it("propagates RPC errors to all waiting callers within the window", async () => {
    const { sut, core } = setUp(SHORT_WINDOW_MS);
    core.rejectNext = new Error("RPC down");

    const p1 = sut.collectMany(["a"]);
    const p2 = sut.collectMany(["b"]);

    await expect(p1).rejects.toThrow("RPC down");
    await expect(p2).rejects.toThrow("RPC down");
  });
});

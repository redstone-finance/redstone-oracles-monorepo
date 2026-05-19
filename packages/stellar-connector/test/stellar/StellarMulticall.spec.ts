import { StellarMulticall } from "../../src/stellar/StellarMulticall";
import {
  FakeDelegate,
  makeBaseInvocation,
  NEVER_FIRES_WITHIN_TEST_MS,
  RPC_URL,
} from "./test-helpers";

function setUp(collectingIntervalMs = NEVER_FIRES_WITHIN_TEST_MS) {
  const delegate = new FakeDelegate();
  const sut = new StellarMulticall(RPC_URL, undefined, collectingIntervalMs);
  sut.delegateClient = new WeakRef(delegate);

  return { sut, delegate };
}

describe("StellarMulticall (per-block routing)", () => {
  it("routes calls with different blockNumbers to independent collectors (no cross-block batch)", async () => {
    const { sut, delegate } = setUp();

    const [r1, r2] = await Promise.all([
      sut.call(makeBaseInvocation("foo"), 10),
      sut.call(makeBaseInvocation("foo"), 20),
    ]);

    expect(r1).toBe("delegate:foo@10");
    expect(r2).toBe("delegate:foo@20");
    expect(delegate.simulateInvocationCalls.sort((a, b) => a.block! - b.block!)).toEqual([
      { method: "foo", block: 10 },
      { method: "foo", block: 20 },
    ]);
  });

  it("preflights waitForBlockNumber with the caller's blockNumber (not max across blocks)", async () => {
    const { sut, delegate } = setUp();

    await Promise.all([
      sut.call(makeBaseInvocation("foo"), 10),
      sut.call(makeBaseInvocation("bar"), 20),
    ]);

    expect(delegate.waitForBlockNumberCalls.sort((a, b) => a! - b!)).toEqual([10, 20]);
  });

  it("dedupes identical concurrent calls within the same block", async () => {
    const { sut, delegate } = setUp();

    const [r1, r2] = await Promise.all([
      sut.call(makeBaseInvocation("foo", 1), 10),
      sut.call(makeBaseInvocation("foo", 1), 10),
    ]);

    expect(r1).toBe("delegate:foo@10");
    expect(r2).toBe("delegate:foo@10");
    expect(delegate.simulateInvocationCalls).toEqual([{ method: "foo", block: 10 }]);
  });

  it("does NOT dedupe when only the block differs", async () => {
    const { sut, delegate } = setUp();

    await Promise.all([
      sut.call(makeBaseInvocation("foo", 1), 10),
      sut.call(makeBaseInvocation("foo", 1), 20),
    ]);

    expect(delegate.simulateInvocationCalls).toHaveLength(2);
  });

  it("sees a delegateClient assigned after construction", async () => {
    const sut = new StellarMulticall(RPC_URL, undefined, NEVER_FIRES_WITHIN_TEST_MS);
    const delegate = new FakeDelegate();
    sut.delegateClient = new WeakRef(delegate);

    const result = await sut.call(makeBaseInvocation("foo"), 1);

    expect(result).toBe("delegate:foo@1");
    expect(delegate.simulateInvocationCalls).toEqual([{ method: "foo", block: 1 }]);
  });

  it("applies the per-call transform on the result", async () => {
    const { sut } = setUp();

    const result = await sut.call(makeBaseInvocation("foo"), 5, (v) => `transformed:${String(v)}`);

    expect(result).toBe("transformed:delegate:foo@5");
  });
});

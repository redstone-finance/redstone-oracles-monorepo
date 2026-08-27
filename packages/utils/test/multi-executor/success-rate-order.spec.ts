import {
  CompositeFnDelegate,
  FallbackExecutor,
  FnBox,
  FnDelegate,
  SuccessRateFnDelegate,
} from "../../src/multi-executor";

const RESULTS = ["first", "second", "third"];
const RPC_URLS = ["https://rpc-0", "https://rpc-1", "https://rpc-2"];
const DEAD_INDEX = 0;
const LIVE_INDEX = 1;
const RECOVERY_CALL_COUNT = 50;
const SINGLE_FAILURE_RECOVERY_MS = 61_000;

describe("SuccessRateFnDelegate", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("is shared per network and rpc set, so scores outlive one provider", () => {
    const first = SuccessRateFnDelegate.getCachedConfig(RPC_URLS, 1);
    const again = SuccessRateFnDelegate.getCachedConfig([...RPC_URLS], 1);
    const otherNetwork = SuccessRateFnDelegate.getCachedConfig(RPC_URLS, 2);

    expect(again.delegate).toBe(first.delegate);
    expect(otherNetwork.delegate).not.toBe(first.delegate);
  });

  it("keeps the given order before anything was scored", () => {
    const sut = delegate(10);
    const fnBoxes = boxes([]);

    expect(order(sut, fnBoxes)).toEqual([0, 1, 2]);
  });

  it("puts the one that failed behind the untouched ones", () => {
    const sut = delegate(11);
    const fnBoxes = boxes([]);

    sut.didFail(fnBoxes[DEAD_INDEX]);

    expect(order(sut, fnBoxes)).toEqual([1, 2, 0]);
  });

  it("ranks by how recently a call failed, not by how many did", () => {
    const sut = delegate(12);
    const fnBoxes = boxes([]);

    score(sut, fnBoxes[0], [true, ...succeeding(RECOVERY_CALL_COUNT)]);
    score(sut, fnBoxes[1], [...succeeding(RECOVERY_CALL_COUNT), true]);

    expect(order(sut, fnBoxes)).toEqual([2, 0, 1]);
  });

  it("makes the fallback start from the one that answered last time", async () => {
    const sut = delegate(13);
    const calls: number[] = [];
    const executor = new FallbackExecutor<string>();

    await executor.execute(boxes(calls, sut, DEAD_INDEX));
    calls.length = 0;
    const result = await executor.execute(boxes(calls, sut, DEAD_INDEX));

    expect(result).toBe(RESULTS[LIVE_INDEX]);
    expect(calls).toEqual([LIVE_INDEX]);
  });

  it("lets a recovered rpc overtake one that keeps failing", () => {
    const sut = delegate(15);
    const fnBoxes = boxes([]);

    score(sut, fnBoxes[0], [true, ...succeeding(RECOVERY_CALL_COUNT)]);
    score(sut, fnBoxes[1], [true]);

    expect(order(sut, fnBoxes)).toEqual([2, 0, 1]);
  });

  it("lets an unused demoted rpc regain its configured spot over time", () => {
    jest.useFakeTimers();
    const sut = delegate(16);
    const fnBoxes = boxes([]);

    sut.didFail(fnBoxes[DEAD_INDEX]);

    expect(order(sut, fnBoxes)).toEqual([1, 2, 0]);
    jest.advanceTimersByTime(SINGLE_FAILURE_RECOVERY_MS);
    expect(order(sut, fnBoxes)).toEqual([0, 1, 2]);
  });

  it("dispose clears the scores and stops the timers", () => {
    jest.useFakeTimers();
    const sut = delegate(17);
    const fnBoxes = boxes([]);

    sut.didFail(fnBoxes[DEAD_INDEX]);

    expect(jest.getTimerCount()).toBe(1);

    sut.dispose();

    expect(jest.getTimerCount()).toBe(0);
    expect(order(sut, fnBoxes)).toEqual([0, 1, 2]);
  });

  it("is composable with another delegate", () => {
    const sut = new CompositeFnDelegate([{}, delegate(14)]);
    const fnBoxes = boxes([]);

    sut.didFail(fnBoxes[DEAD_INDEX], new Error("down"), 0);

    expect(order(sut, fnBoxes)).toEqual([1, 2, 0]);
  });
});

function delegate(networkId: number) {
  const { delegate: cached } = SuccessRateFnDelegate.getCachedConfig(RPC_URLS, networkId);

  return cached as SuccessRateFnDelegate;
}

function order(delegateUnderTest: FnDelegate, fnBoxes: FnBox<string>[]) {
  return (delegateUnderTest.order?.(fnBoxes) ?? fnBoxes).map(({ index }) => index);
}

function succeeding(callCount: number) {
  return Array.from({ length: callCount }, () => false);
}

function score(delegateUnderTest: FnDelegate, fnBox: FnBox<string>, failures: boolean[]) {
  for (const failed of failures) {
    if (failed) {
      delegateUnderTest.didFail?.(fnBox, new Error("down"), 0);
    } else {
      delegateUnderTest.didSucceed?.(fnBox, RESULTS[fnBox.index], 0);
    }
  }
}

function boxes(calls: number[], delegate?: FnDelegate, ...deadIndexes: number[]): FnBox<string>[] {
  return RESULTS.map((result, index) => ({
    name: "call",
    index,
    description: RPC_URLS[index],
    delegate,
    fn: () => {
      calls.push(index);

      return deadIndexes.includes(index)
        ? Promise.reject(new Error(`${RPC_URLS[index]} is down`))
        : Promise.resolve(result);
    },
  }));
}

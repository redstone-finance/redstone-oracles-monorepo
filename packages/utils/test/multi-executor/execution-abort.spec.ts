import { sleep } from "../../src/common";
import {
  AgreementExecutor,
  CompositeFnDelegate,
  ExecutionAbortedError,
  Executor,
  FnBox,
  FnDelegate,
} from "../../src/multi-executor";

const QUORUM = 2;
const POLL_INTERVAL_MS = 5;
const MAX_POLLS = 100;
const NO_SIGNAL_POLL_COUNT = 3;
const AGREED = "agreed";
const SLOW_INDEX = 2;

describe("execution abort", () => {
  it("tells a function that has not sent its request that the quorum no longer needs it", async () => {
    const waiter = makeWaiter();
    const sut = new AgreementExecutor<string>(QUORUM, undefined);

    const [result, sawAbort] = await Promise.all([
      sut.execute([fnBox(0, agree), fnBox(1, agree), fnBox(SLOW_INDEX, waiter.fn)]),
      waiter.sawAbort,
    ]);

    expect(result).toBe(AGREED);
    expect(sawAbort).toBe(true);
  });

  it("does not score an aborted function as a failed one", async () => {
    const delegate = new CompositeFnDelegate([]);
    const didFail = jest.spyOn(delegate, "didFail");
    const waiter = makeWaiter();
    const sut = new AgreementExecutor<string>(QUORUM, undefined);

    await Promise.all([
      sut.execute([
        fnBox(0, agree, delegate),
        fnBox(1, agree, delegate),
        fnBox(SLOW_INDEX, waiter.fn, delegate),
      ]),
      waiter.sawAbort,
    ]);

    expect(didFail).not.toHaveBeenCalled();
  });

  it("never aborts a function whose box carries no signal", async () => {
    const waiter = makeWaiter(NO_SIGNAL_POLL_COUNT);

    const result = await Executor.execFn(fnBox(0, waiter.fn));

    expect(result).toBe(AGREED);
    await expect(waiter.sawAbort).resolves.toBe(false);
  });
});

function agree() {
  return Promise.resolve(AGREED);
}

function makeWaiter(maxPolls = MAX_POLLS) {
  let notice!: (sawAbort: boolean) => void;
  const sawAbort = new Promise<boolean>((resolve) => (notice = resolve));

  const fn = async (shouldAbort: () => boolean) => {
    for (let poll = 0; poll < maxPolls; poll++) {
      if (shouldAbort()) {
        notice(true);

        throw new ExecutionAbortedError("not needed");
      }
      await sleep(POLL_INTERVAL_MS);
    }
    notice(false);

    return AGREED;
  };

  return { fn, sawAbort };
}

function fnBox(
  index: number,
  fn: (shouldAbort: () => boolean) => Promise<string>,
  delegate?: FnDelegate
): FnBox<string> {
  return { fn, index, name: "call", description: `rpc-${index}`, delegate };
}

import { secToMs } from "../../src/common";
import { FnBox, FnDelegate, QuarantinedListFnDelegate } from "../../src/multi-executor";

const INELIGIBLE_RPC_URL = "https://rpc-ineligible";
const QUARANTINED_RPC_URL = "https://rpc-quarantined";
const HEALTHY_RPC_URL = "https://rpc-healthy";
const RPC_URLS = [INELIGIBLE_RPC_URL, QUARANTINED_RPC_URL, HEALTHY_RPC_URL];
const MINIMAL_PROVIDER_COUNT = 2;
const NETWORK_ID = 21;
const PAST_EVALUATION_MS = secToMs(31);

describe("QuarantinedListFnDelegate", () => {
  let sut: FnDelegate | undefined;
  let quarantined: FnBox<string>;

  beforeEach(() => {
    jest.useFakeTimers();
    ({ delegate: sut } = QuarantinedListFnDelegate.getCachedConfig(
      RPC_URLS,
      NETWORK_ID,
      MINIMAL_PROVIDER_COUNT
    ));
    quarantined = {
      name: "call",
      index: RPC_URLS.indexOf(QUARANTINED_RPC_URL),
      description: QUARANTINED_RPC_URL,
      fn: () => Promise.resolve(QUARANTINED_RPC_URL),
      isEligible: (rpc) => rpc !== INELIGIBLE_RPC_URL,
    };
    sut?.didFail?.(quarantined, new Error(QUARANTINED_RPC_URL), 0);
    jest.advanceTimersByTime(PAST_EVALUATION_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps the minimal count of eligible rpcs out of quarantine", () => {
    expect(sut?.isQuarantined?.(quarantined)).toBe(false);
  });
});

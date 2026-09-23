import {
  extractSharedObjectId,
  extractWritePriceCalls,
} from "../src/client/lookup/SuiWriteCallParsing";
import {
  ADAPTER_OBJECT_ID,
  FEED_ID,
  makeGraphQlInputs,
  makeJsonRpcInputs,
  OTHER_FEED_ID,
  PAYLOAD_HEX,
  WRITE_PRICE_FUNCTION,
} from "./fixtures";

const WRITE_CALL = { functionName: WRITE_PRICE_FUNCTION, argInputIxs: [0, 1, 2] };
const OTHER_FUNCTION = "update_config";
const WRITE_CALL_WITHOUT_PAYLOAD = {
  functionName: WRITE_PRICE_FUNCTION,
  argInputIxs: [0, 1, undefined],
};

describe("extractWritePriceCalls", () => {
  it("should drop the bcs length prefix of a graphql input", () => {
    const calls = extractWritePriceCalls(makeGraphQlInputs(FEED_ID), [WRITE_CALL]);

    expect(calls).toEqual([{ feedId: FEED_ID, payload: PAYLOAD_HEX }]);
  });

  it("should read a json-rpc input, whose value carries no prefix", () => {
    const calls = extractWritePriceCalls(makeJsonRpcInputs(FEED_ID), [WRITE_CALL]);

    expect(calls).toEqual([{ feedId: FEED_ID, payload: PAYLOAD_HEX }]);
  });

  it("should give both clients the same feed id and payload", () => {
    const fromGraphQl = extractWritePriceCalls(makeGraphQlInputs(OTHER_FEED_ID), [WRITE_CALL]);
    const fromJsonRpc = extractWritePriceCalls(makeJsonRpcInputs(OTHER_FEED_ID), [WRITE_CALL]);

    expect(fromGraphQl).toEqual(fromJsonRpc);
  });

  it("should skip a call of another function", () => {
    const calls = extractWritePriceCalls(makeGraphQlInputs(FEED_ID), [
      { functionName: OTHER_FUNCTION, argInputIxs: [0, 1, 2] },
    ]);

    expect(calls).toEqual([]);
  });

  it("should skip a write call whose payload input is missing", () => {
    const calls = extractWritePriceCalls(makeGraphQlInputs(FEED_ID), [WRITE_CALL_WITHOUT_PAYLOAD]);

    expect(calls).toEqual([]);
  });
});

describe("extractSharedObjectId", () => {
  it("should take the shared object of the first write call", () => {
    expect(extractSharedObjectId(makeGraphQlInputs(FEED_ID), [WRITE_CALL])).toEqual(
      ADAPTER_OBJECT_ID
    );
  });

  it("should return nothing when there is no write call", () => {
    expect(extractSharedObjectId(makeGraphQlInputs(FEED_ID), [])).toEqual(undefined);
  });
});

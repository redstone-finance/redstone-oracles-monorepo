import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { CantonChoiceExerciser, CantonContractUpdater } from "../src/tx/CantonContractUpdater";
import { getArrayifiedFeedId } from "../src/utils/conversions";
import { BASE_TS, CID, SIGNATORY, TX_HASH } from "./test-helpers";

const ACT_AS = SIGNATORY;
const CONTEXT = { updateStartTimeMs: BASE_TS };

const makeParamsProvider = (feedIds: string[], payloadHex = "0xdeadbeef") => {
  const getPayloadHex = jest.fn().mockResolvedValue(payloadHex);
  const paramsProvider = {
    getPayloadHex,
    getArrayifiedFeedIds: jest.fn().mockReturnValue(feedIds.map(getArrayifiedFeedId)),
    getDataFeedIds: jest.fn().mockReturnValue(feedIds),
  } as unknown as ContractParamsProvider;

  return { paramsProvider, getPayloadHex };
};

const makeExerciser = (
  mocks: {
    exerciseWritePricesChoice?: jest.Mock;
    onError?: jest.Mock;
  } = {}
) => {
  const exerciseWritePricesChoice = mocks.exerciseWritePricesChoice ?? jest.fn();
  const onError = mocks.onError ?? jest.fn();
  const exerciser: CantonChoiceExerciser = { exerciseWritePricesChoice, onError };

  return { exerciser, exerciseWritePricesChoice, onError };
};

describe("CantonContractUpdater", () => {
  it("returns contractId as transactionHash when result is an ActiveContractData", async () => {
    const { exerciser, onError } = makeExerciser({
      exerciseWritePricesChoice: jest.fn().mockResolvedValue({
        result: {
          contractId: CID.ethPill,
          synchronizerId: "",
          createdEventBlob: undefined,
        },
        metadata: { paidTrafficCost: 1_500 },
      }),
    });
    const updater = new CantonContractUpdater(exerciser, ACT_AS);

    const status = await updater.update(makeParamsProvider(["ETH", "BTC"]).paramsProvider, CONTEXT);

    expect(FP.unwrapOr(status, undefined)).toEqual({
      transactionHash: CID.ethPill,
      metadata: { paidTrafficCost: 1_500 },
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("uses a string result directly as transactionHash", async () => {
    const { exerciser } = makeExerciser({
      exerciseWritePricesChoice: jest.fn().mockResolvedValue({
        result: TX_HASH.generic,
        metadata: { paidTrafficCost: 2_100 },
      }),
    });
    const updater = new CantonContractUpdater(exerciser, ACT_AS);

    const status = await updater.update(makeParamsProvider(["CC"]).paramsProvider, CONTEXT);

    expect(FP.unwrapOr(status, undefined)?.transactionHash).toBe(TX_HASH.generic);
  });

  it("calls onError and returns an Err when exerciser throws", async () => {
    const { exerciser, onError } = makeExerciser({
      exerciseWritePricesChoice: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const updater = new CantonContractUpdater(exerciser, ACT_AS);

    const status = await updater.update(makeParamsProvider(["ETH"]).paramsProvider, CONTEXT);

    expect(FP.isErr(status)).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("forwards actAs, arrayified feed ids and payload to the exerciser", async () => {
    const { exerciser, exerciseWritePricesChoice } = makeExerciser({
      exerciseWritePricesChoice: jest.fn().mockResolvedValue({
        result: TX_HASH.generic,
        metadata: {},
      }),
    });
    const updater = new CantonContractUpdater(exerciser, ACT_AS);
    const { paramsProvider, getPayloadHex } = makeParamsProvider(["BTC", "CC"], "0xc0ffee");

    await updater.update(paramsProvider, CONTEXT);

    expect(exerciseWritePricesChoice).toHaveBeenCalledWith(ACT_AS, {
      feedIds: [getArrayifiedFeedId("BTC"), getArrayifiedFeedId("CC")],
      payloadHex: "0xc0ffee",
    });
    expect(getPayloadHex).toHaveBeenCalledWith(false, {
      withUnsignedMetadata: true,
      metadataTimestamp: CONTEXT.updateStartTimeMs,
      componentName: "canton-connector",
    });
  });

  it("exposes actAs via getSignerAddress", () => {
    const { exerciser } = makeExerciser();
    const updater = new CantonContractUpdater(exerciser, ACT_AS);

    expect(updater.getSignerAddress()).toBe(ACT_AS);
  });
});

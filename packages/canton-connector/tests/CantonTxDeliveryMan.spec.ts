import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { CantonTrafficMeter, CantonTxDeliveryMan } from "../src";
import { CantonContractUpdater, CantonTxResultExt } from "../src/tx/CantonContractUpdater";
import { SIGNATORY, TX_HASH } from "./test-helpers";

const CONFIG = { maxTxSendAttempts: 1, expectedTxDeliveryTimeInMs: 5_000 };
const BASE = 1_000_000_000;

const resetAccumulatingSingleton = () => {
  (
    CantonTrafficMeter as unknown as {
      accumulatingInstance?: CantonTrafficMeter;
    }
  ).accumulatingInstance = undefined;
};

type RegisterArgs = Parameters<CantonTrafficMeter["register"]>;

const spyOnRegister = (meter: CantonTrafficMeter) => {
  let resolve: (args: RegisterArgs) => void;
  const called = new Promise<RegisterArgs>((r) => (resolve = r));
  const spy = jest.spyOn(meter, "register").mockImplementation((...args: RegisterArgs) => {
    resolve(args);
  });

  return { spy, called };
};

const makeParamsProvider = (feedIds: string[]) =>
  ({
    getDataFeedIds: jest.fn().mockReturnValue(feedIds),
  }) as unknown as ContractParamsProvider;

const makeUpdater = (result: FP.Result<{ transactionHash: string } & CantonTxResultExt, string>) =>
  ({
    update: jest.fn().mockResolvedValue(result),
    getSignerAddress: jest.fn().mockReturnValue(SIGNATORY),
  }) as unknown as CantonContractUpdater;

describe("CantonTxDeliveryMan", () => {
  beforeEach(resetAccumulatingSingleton);

  it("registers initial + final traffic with merged metadata and feedCount", async () => {
    const meter = new CantonTrafficMeter(true);
    const { called } = spyOnRegister(meter);
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(BASE)
      .mockResolvedValueOnce(BASE + 3_500);
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter, fetch);

    const updater = makeUpdater(
      FP.ok({ transactionHash: TX_HASH.eth, metadata: { paidTrafficCost: 3_500 } })
    );

    await deliveryMan.updateContract(updater, makeParamsProvider(["ETH", "BTC", "CC"]));

    expect(await called).toEqual([BASE, BASE + 3_500, { paidTrafficCost: 3_500, feedCount: 3 }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns the super.updateContract result unchanged", async () => {
    const meter = new CantonTrafficMeter(true);
    const fetch = jest.fn().mockResolvedValue(BASE);
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter, fetch);

    const expected = FP.ok({
      transactionHash: TX_HASH.btc,
      metadata: { paidTrafficCost: 2_000 },
    });

    const result = await deliveryMan.updateContract(
      makeUpdater(expected),
      makeParamsProvider(["BTC"])
    );

    expect(FP.unwrapOr(result, undefined)).toEqual({
      transactionHash: TX_HASH.btc,
      metadata: { paidTrafficCost: 2_000 },
    });
  });

  it("swallows fetchTotalConsumedTraffic errors and still registers (undefined, undefined)", async () => {
    const meter = new CantonTrafficMeter(true);
    const { called } = spyOnRegister(meter);
    const fetch = jest.fn().mockRejectedValue(new Error("scan API down"));
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter, fetch);

    await deliveryMan.updateContract(
      makeUpdater(FP.ok({ transactionHash: TX_HASH.cc, metadata: { paidTrafficCost: 777 } })),
      makeParamsProvider(["CC"])
    );

    expect(await called).toEqual([undefined, undefined, { paidTrafficCost: 777, feedCount: 1 }]);
  });

  it("registers only feedCount when super.updateContract returns an Err", async () => {
    const meter = new CantonTrafficMeter(true);
    const { called } = spyOnRegister(meter);
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(BASE)
      .mockResolvedValueOnce(BASE + 5_000);
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter, fetch);

    await deliveryMan.updateContract(makeUpdater(FP.err("boom")), makeParamsProvider(["ETH"]));

    expect(await called).toEqual([BASE, BASE + 5_000, { feedCount: 1 }]);
  });
});

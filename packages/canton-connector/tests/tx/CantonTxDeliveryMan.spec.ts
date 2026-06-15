import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { CantonContractUpdater, CantonTxResultExt } from "../../src/tx/CantonContractUpdater";
import { CantonTxDeliveryMan } from "../../src/tx/CantonTxDeliveryMan";
import { ConstCantonTrafficMeter } from "../../src/tx/ConstCantonTrafficMeter";
import { SIGNATORY, TX_HASH } from "../test-helpers";
import { ResetableCantonTrafficMeter } from "./resetable-canton-traffic-meter";

const CONFIG = { maxTxSendAttempts: 1, expectedTxDeliveryTimeInMs: 5_000 };

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
  beforeEach(ResetableCantonTrafficMeter.resetAccumulatingInstance);

  it("brackets the send with beforeUpdate and afterUpdate(feedIds, result)", async () => {
    const meter = new ConstCantonTrafficMeter(true, 3);
    const before = jest.spyOn(meter, "beforeUpdate");
    const after = jest.spyOn(meter, "afterUpdate");
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter);
    const ok = FP.ok({ transactionHash: TX_HASH.eth, metadata: { paidTrafficCost: 100 } });

    const result = await deliveryMan.updateContract(
      makeUpdater(ok),
      makeParamsProvider(["ETH", "BTC", "CC"])
    );

    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith(["ETH", "BTC", "CC"], result);
    expect(before.mock.invocationCallOrder[0]).toBeLessThan(after.mock.invocationCallOrder[0]);
    expect(FP.unwrapOr(result, undefined)?.transactionHash).toBe(TX_HASH.eth);
  });

  it("returns an Err result unchanged and still runs afterUpdate", async () => {
    const meter = new ConstCantonTrafficMeter(true, 1);
    const after = jest.spyOn(meter, "afterUpdate");
    const deliveryMan = new CantonTxDeliveryMan(CONFIG, meter);

    const result = await deliveryMan.updateContract(
      makeUpdater(FP.err("boom")),
      makeParamsProvider(["ETH"])
    );

    expect(after).toHaveBeenCalledWith(["ETH"], result);
    expect(FP.isErr(result)).toBe(true);
  });
});

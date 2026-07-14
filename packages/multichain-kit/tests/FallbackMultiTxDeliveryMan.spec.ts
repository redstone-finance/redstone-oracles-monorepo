import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { ContractUpdater, FallbackMultiTxDeliveryMan, FallbackUpdater } from "../src";

describe("FallbackMultiTxDeliveryMan", () => {
  const MAX_FEEDS = 4;
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 1,
    authorizedSigners: [],
    dataPackagesIds: ["ETH"],
  });

  const createDeliveryMan = (fallbackUpdater: FallbackUpdater, maxTxSendAttempts = 1) =>
    new FallbackMultiTxDeliveryMan(
      {
        maxTxSendAttempts,
        expectedTxDeliveryTimeInMs: 5000,
        batchSizePerRequestParams: () => MAX_FEEDS,
      },
      fallbackUpdater
    );

  it("delivers via the primary updater and does not touch the fallback", async () => {
    const update = jest.fn().mockResolvedValue(FP.ok({ transactionHash: "primary" }));
    const writePrices = jest.fn();
    const primary: ContractUpdater = { update };
    const fallbackUpdater: FallbackUpdater = { writePrices };

    const result = await createDeliveryMan(fallbackUpdater).updateContract(primary, paramsProvider);

    expect(result).toEqual(FP.ok({ transactionHash: "primary" }));
    expect(writePrices).not.toHaveBeenCalled();
  });

  it("falls back to the fallback updater when the primary fails", async () => {
    const update = jest.fn().mockResolvedValue(FP.err("primary down"));
    const writePrices = jest.fn().mockResolvedValue(FP.ok({ transactionHash: "fallback" }));
    const primary: ContractUpdater = { update };
    const fallbackUpdater: FallbackUpdater = { writePrices };

    const result = await createDeliveryMan(fallbackUpdater).updateContract(primary, paramsProvider);

    expect(result).toEqual(FP.ok({ transactionHash: "fallback" }));
    expect(writePrices).toHaveBeenCalledTimes(1);
  });

  it("retries the primary N times before falling back once", async () => {
    const PRIMARY_ATTEMPTS = 3;
    const update = jest.fn().mockResolvedValue(FP.err("primary down"));
    const writePrices = jest.fn().mockResolvedValue(FP.ok({ transactionHash: "fallback" }));
    const primary: ContractUpdater = { update };
    const fallbackUpdater: FallbackUpdater = { writePrices };

    await createDeliveryMan(fallbackUpdater, PRIMARY_ATTEMPTS).updateContract(
      primary,
      paramsProvider
    );

    expect(update).toHaveBeenCalledTimes(PRIMARY_ATTEMPTS);
    expect(writePrices).toHaveBeenCalledTimes(1);
  });
});

import { ContractParamsProvider } from "@redstone-finance/sdk";
import redstone from "redstone-api";
import { provider } from "../common/provider";
import { readDeployedHex } from "../common/read-deployed-hex";
import { connectPricesContract } from "./prices-contract-test-utils";

jest.setTimeout(10 * 60000);

describe("Integrated and initialized prices contract", () => {
  it("write_prices should write the price data that can be read then", async () => {
    if (process.env.IS_CI === "true") {
      return console.log("Skipping in CI env");
    }

    const adapter = await (
      await connectPricesContract(readDeployedHex(), false, await provider())
    ).getAdapter();
    const paramsProvider = new ContractParamsProvider({
      dataServiceId: "redstone-avalanche-prod",
      uniqueSignersCount: 2,
      dataPackagesIds: ["ETH", "BTC"],
    });

    await adapter.writePricesFromPayloadToContract(paramsProvider);
    const prices = await adapter.readPricesFromContract(paramsProvider);
    const timestamp = await adapter.readTimestampFromContract();

    const localTimestamp = Date.now();

    const TEN_MINUTES = 1000 * 60 * 10;
    expect(timestamp).toBeLessThan(localTimestamp + TEN_MINUTES);
    expect(timestamp).toBeGreaterThan(localTimestamp - TEN_MINUTES);

    const CHANGE_FACTOR = 0.1;

    const baseEthPrice = (await redstone.getPrice("ETH")).value * 10 ** 8;
    const baseBtcPrice = (await redstone.getPrice("BTC")).value * 10 ** 8;

    expect(prices[0]).toBeLessThan(baseEthPrice * (1 + CHANGE_FACTOR));
    expect(prices[0]).toBeGreaterThan(baseEthPrice * (1 - CHANGE_FACTOR));
    expect(prices[1]).toBeLessThan(baseBtcPrice * (1 + CHANGE_FACTOR));
    expect(prices[1]).toBeGreaterThan(baseBtcPrice * (1 - CHANGE_FACTOR));
  });
});

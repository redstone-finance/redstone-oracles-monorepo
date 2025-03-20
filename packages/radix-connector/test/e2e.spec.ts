import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import {
  ContractParamsProvider,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import "dotenv/config";
import redstone from "redstone-api";
import {
  loadAddress,
  PRICE_ADAPTER_NAME,
  PRIVATE_KEY,
} from "../scripts/constants";
import { PriceAdapterRadixContractConnector, RadixClient } from "../src";
import { RadixApiClient } from "../src/radix/RadixApiClient";

jest.setTimeout(10 * 60000);
jest.unmock("@radixdlt/babylon-gateway-api-sdk");

describe("Integrated and initialized prices contract", () => {
  it("write_prices should write the price data that can be read then", async () => {
    if (!PRIVATE_KEY) {
      return console.log("Skipping when no PRIVATE_KEY provided");
    }

    const client = new RadixClient(
      new RadixApiClient(),
      NetworkId.Stokenet,
      PRIVATE_KEY
    );
    const connector = new PriceAdapterRadixContractConnector(
      client,
      await loadAddress("component", PRICE_ADAPTER_NAME)
    );

    const adapter = await connector.getAdapter();
    const paramsProvider = new ContractParamsProvider({
      dataServiceId: "redstone-primary-prod",
      uniqueSignersCount: 2,
      dataPackagesIds: ["ETH", "BTC"],
      authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    });

    await adapter.writePricesFromPayloadToContract(paramsProvider);
    const prices = (await adapter.readPricesFromContract(paramsProvider)).map(
      Number
    );
    const timestamp = await adapter.readTimestampFromContract("ETH");

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

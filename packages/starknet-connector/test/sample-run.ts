import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import {
  PriceAdapterStarknetContractConnector,
  PriceFeedStarknetContractConnector,
  StarknetConfig,
  getAccount,
} from "../src";
import { PRICE_ADAPTER_ADDRESS, PRICE_FEED_ADDRESS, config } from "./config";

async function main(config: StarknetConfig) {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-avalanche-prod",
    uniqueSignersCount: 1,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-avalanche-prod"),
  });
  const account = getAccount(config);
  const pricesConnector = new PriceAdapterStarknetContractConnector(account, PRICE_ADAPTER_ADDRESS);

  const feedConnector = new PriceFeedStarknetContractConnector(account, PRICE_FEED_ADDRESS);

  await sampleRun(paramsProvider, pricesConnector, feedConnector);
}

void main(config);

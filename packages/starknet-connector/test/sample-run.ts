import { sampleRun } from "@redstone-finance/multichain-kit-legacy";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PriceAdapterStarknetContractConnector, StarknetConfig, getAccount } from "../src";
import { PriceFeedStarknetContractAdapter } from "../src/prices/PriceFeedStarknetContractAdapter";
import { PRICE_ADAPTER_ADDRESS, PRICE_FEED_ADDRESS, config } from "./config";

async function main(config: StarknetConfig) {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 1,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    authenticatedGateways: RedstoneCommon.getAuthenticatedGatewaysFromEnv(),
  });
  const account = getAccount(config);
  const pricesConnector = new PriceAdapterStarknetContractConnector(account, PRICE_ADAPTER_ADDRESS);

  const adapter = await pricesConnector.getAdapter();
  const feedAdapter = new PriceFeedStarknetContractAdapter(account, PRICE_FEED_ADDRESS);

  await sampleRun(paramsProvider, adapter, pricesConnector, feedAdapter);
}

void main(config);

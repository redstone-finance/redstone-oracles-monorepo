import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { CoreFactoryCantonContractConnector } from "../src";
import { PriceFeedEntryCantonContractConnector } from "../src/adapters/PriceFeedEntryCantonContractConnector";
import { makeDefaultClient } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;
const ADAPTER_ID =
  "00bd38e47f5966f047571ea0d3f62f5ee9b1e0b11fb387d53ac10f87ca5fcc6235ca121220dfbf39c42f1a6eb84f56649fe64e0fcaf4135040e923834d215363d6b9f96d07";

async function main(adapterId = ADAPTER_ID) {
  const [client, _updateClient] = [VIEWER_PARTY_NAME, UPDATER_PARTY_NAME].map(makeDefaultClient);

  const connector = new CoreFactoryCantonContractConnector(client, adapterId);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new PriceFeedEntryCantonContractConnector(client, "ETH");

  await sampleRun(paramsProvider, connector, ethPriceFeedConnector);
}

void main();

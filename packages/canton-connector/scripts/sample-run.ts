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
  "00b13a09ae311a09ee2a702411ec9d05e6324b9fa6866f1df46e37594c6817f087ca121220328283362ef44ccebad1401fe7d34c8db43fdb804bfb57e42a5c9757a6c807c4";

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

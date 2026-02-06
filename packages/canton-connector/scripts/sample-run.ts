import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { CoreFactoryCantonContractConnector, DEFS_KEY_CORE_FEATURED } from "../src";
import { PricePillCantonContractConnector } from "../src/adapters/PricePillCantonContractConnector";
import { makeDefaultClient } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;

async function main() {
  const [client, _updateClient] = [VIEWER_PARTY_NAME, UPDATER_PARTY_NAME].map(makeDefaultClient);

  const connector = new CoreFactoryCantonContractConnector(
    client,
    client.Defs[DEFS_KEY_CORE_FEATURED].contractId
  );

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new PricePillCantonContractConnector(client, "ETH");

  await sampleRun(paramsProvider, connector, ethPriceFeedConnector);
}

void main();

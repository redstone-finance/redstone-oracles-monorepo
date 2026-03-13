import { BackwardCompatibleConnector } from "@redstone-finance/multichain-kit";
import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { PricesCantonContractConnector } from "../src";
import { PricePillCantonContractConnector } from "../src/adapters/PricePillCantonContractConnector";
import { makeDefaultClient } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;
const OWNER_PARTY_NAME = `RedStoneOracleOwner`;

const ADAPTER_ID = "RedStoneAdapter-v2-0.4.0";

async function main() {
  const [client, updateClient, _ownerClient] = [
    VIEWER_PARTY_NAME,
    UPDATER_PARTY_NAME,
    OWNER_PARTY_NAME,
  ].map(makeDefaultClient);

  const connector = new PricesCantonContractConnector(client, updateClient, ADAPTER_ID);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new PricePillCantonContractConnector(client, "ETH", ADAPTER_ID);
  const oldConnector = new BackwardCompatibleConnector(connector);

  await sampleRun(paramsProvider, oldConnector, ethPriceFeedConnector);
}

void main();

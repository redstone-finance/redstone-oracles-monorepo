import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import "dotenv/config";
import { CantonClient } from "../src";
import { PricesCantonContractConnector } from "../src/adapters/PricesCantonContractConnector";
import { getJsonApiUrl, keycloakTokenProvider } from "./utils";

const PARTY_SUFFIX = "1220a0242797a84e1d8c492f1259b3f87d561fcbde2e4b2cebc4572ddfc515b44c28";
const VIEWER_PARTY_ID = `RedStoneOracleViewer::${PARTY_SUFFIX}`;
const UPDATER_PARTY_ID = `RedStoneOracleUpdater::${PARTY_SUFFIX}`;
const ADAPTER_ID = "RedStoneAdapter-040";

async function main() {
  const tokenProvider = () => keycloakTokenProvider();
  const [client, updateClient] = [VIEWER_PARTY_ID, UPDATER_PARTY_ID].map(
    (partyId) => new CantonClient(partyId, getJsonApiUrl(), tokenProvider)
  );

  const connector = new PricesCantonContractConnector(client, updateClient, ADAPTER_ID);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  await sampleRun(paramsProvider, connector, undefined);
}

void main();

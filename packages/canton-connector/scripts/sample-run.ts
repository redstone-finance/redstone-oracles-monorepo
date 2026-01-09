import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { CantonClient } from "../src";
import { PricesCantonContractConnector } from "../src/adapters/PricesCantonContractConnector";
import { getJsonApiUrl, keycloakTokenProvider, readPartySuffix } from "./utils";

const VIEWER_PARTY_ID = `RedStoneOracleViewer`;
const UPDATER_PARTY_ID = `RedStoneOracleUpdater`;
const ADAPTER_ID = "RedStoneAdapter-040";

async function main(adapterId = ADAPTER_ID) {
  const tokenProvider = () => keycloakTokenProvider();
  const [client, updateClient] = [VIEWER_PARTY_ID, UPDATER_PARTY_ID].map(
    (partyId) =>
      new CantonClient(`${partyId}::${readPartySuffix()}`, getJsonApiUrl(), tokenProvider)
  );

  const connector = new PricesCantonContractConnector(client, updateClient, adapterId);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  await sampleRun(paramsProvider, connector, undefined);
}

void main();

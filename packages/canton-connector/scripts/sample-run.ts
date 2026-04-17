import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import {
  CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
  CantonBlockchainService,
  PricePillCantonContractAdapter,
  PricesCantonContractAdapter,
  readAdditionalPillViewers,
} from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;

const ADAPTER_ID = "RedStoneAdapter-v16-0.4.0";

async function main() {
  const client = makeDefaultClient();

  console.log(await client.getRemainingTraffic());

  const adapter = new PricesCantonContractAdapter(client, {
    ...CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
    viewerPartyId: makePartyId(VIEWER_PARTY_NAME),
    updaterPartyId: makePartyId(UPDATER_PARTY_NAME),
    adapterId: ADAPTER_ID,
    additionalPillViewers: readAdditionalPillViewers(),
  });
  const service = new CantonBlockchainService(client);

  const SUFFIX_24_7 = "---24_7";

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: [
      "XYZ100---PERP",
      ...["AAPL", "TSLA", "NVDA", "GOOGL"].map((feed) => `${feed}${SUFFIX_24_7}`),
    ],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const feedAdapter = new PricePillCantonContractAdapter(
    client,
    makePartyId(VIEWER_PARTY_NAME),
    ADAPTER_ID,
    `TSLA${SUFFIX_24_7}`
  );

  await sampleRun(paramsProvider, adapter, service, feedAdapter);
}

void main();

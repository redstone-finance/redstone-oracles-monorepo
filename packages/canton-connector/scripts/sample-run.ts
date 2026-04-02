import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import {
  CantonBlockchainService,
  PricePillCantonContractConnector,
  PricesCantonContractAdapter,
} from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;

const ADAPTER_ID = "RedStoneAdapter-v12-0.4.0";

async function main() {
  const client = makeDefaultClient();

  console.log(await client.getRemainingTraffic());

  const adapter = new PricesCantonContractAdapter(
    client,
    makePartyId(VIEWER_PARTY_NAME),
    makePartyId(UPDATER_PARTY_NAME),
    ADAPTER_ID,
    RedstoneCommon.getFromEnv("ADDITIONAL_PILL_VIEWERS", z.array(z.string()).optional())
  );
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

  const ethPriceFeedConnector = new PricePillCantonContractConnector(
    client,
    makePartyId(VIEWER_PARTY_NAME),
    ADAPTER_ID,
    `TSLA${SUFFIX_24_7}`
  );
  const feedAdapter = await ethPriceFeedConnector.getAdapter();

  await sampleRun(paramsProvider, adapter, service, feedAdapter);
}

void main();

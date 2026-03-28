import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import {
  CantonBlockchainService,
  PricePillCantonContractConnector,
  PricesCantonContractAdapter,
} from "../src";
import { makeDefaultClient } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;
const OWNER_PARTY_NAME = `RedStoneOracleOwner`;

const ADAPTER_ID = "RedStoneAdapter-v12-0.4.0";

async function main() {
  const [client, updateClient, _ownerClient] = [
    VIEWER_PARTY_NAME,
    UPDATER_PARTY_NAME,
    OWNER_PARTY_NAME,
  ].map(makeDefaultClient);

  console.log(await client.getRemainingTraffic());

  const adapter = new PricesCantonContractAdapter(
    client,
    updateClient,
    ADAPTER_ID,
    RedstoneCommon.getFromEnv("ADDITIONAL_PILL_VIEWERS", z.array(z.string()).optional())
  );
  const service = new CantonBlockchainService(client);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new PricePillCantonContractConnector(client, ADAPTER_ID, "BTC");
  const feedAdapter = await ethPriceFeedConnector.getAdapter();

  await sampleRun(paramsProvider, adapter, service, feedAdapter);
}

void main();

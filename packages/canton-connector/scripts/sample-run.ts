import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
  CantonBlockchainService,
  makeCantonContractAdapter,
  readAdditionalPillViewers,
  readPrivateKey,
  readUseConstTrafficMeter,
} from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const VIEWER_PARTY_NAME = `RedStoneOracleViewer`;
const UPDATER_PARTY_NAME = `RedStoneOracleUpdater`;
const ADAPTER_ID =
  "004f4041ca1cbeb0333a45828380eef045826a9918054cb9223d95b46b3614e086ca12122066489fff8ddceee0dbc8772f3f3f481529399d0249a4a3604e78ca02cb20112b";

async function main() {
  const client = makeDefaultClient();

  try {
    console.log(await client.getRemainingTraffic());
  } catch (error) {
    console.error(RedstoneCommon.stringifyError(error));
  }

  const SUFFIX_24_7 = "---24_7";
  const dataPackagesIds =
    client.network === "mainnet"
      ? [
          "XYZ100---PERP",
          ...["AAPL", "TSLA", "NVDA", "GOOGL"].map((feed) => `${feed}${SUFFIX_24_7}`),
        ]
      : ["ETH", "BTC", "CC"];

  const viewerPartyId = makePartyId(VIEWER_PARTY_NAME);
  const adapter = makeCantonContractAdapter(
    client,
    {
      ...CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
      viewerPartyId,
      updaterPartyId: makePartyId(UPDATER_PARTY_NAME),
      adapterId: ADAPTER_ID,
      additionalPillViewers: readAdditionalPillViewers(),
      totalFeedCount: dataPackagesIds.length,
      useConstTrafficMeter: readUseConstTrafficMeter(),
      privateKey: readPrivateKey(),
    },
    client.getDefs().capsOracleId
  );
  const service = new CantonBlockchainService(client);
  const authenticatedGateways = RedstoneCommon.getRequiredAuthenticatedGatewaysFromEnv();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    authenticatedGateways,
  });

  await sampleRun(paramsProvider, adapter, service);
}

void main();

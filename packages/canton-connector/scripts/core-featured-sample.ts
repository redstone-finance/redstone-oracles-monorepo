import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreFeaturedCantonContractAdapter, readPartySuffix } from "../src";
import { getJsonApiUrl, getTokenProvider, readNetwork, readUserId } from "./utils";

export async function coreFeaturedSample() {
  const tokenProvider = getTokenProvider();
  const partyId = `RedStoneOracleViewer::${readPartySuffix()}`;

  const client = new CantonClient(
    partyId,
    getJsonApiUrl(),
    tokenProvider,
    readNetwork(),
    readUserId()
  );
  const adapter = new CoreFeaturedCantonContractAdapter(client);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreFeaturedSample();

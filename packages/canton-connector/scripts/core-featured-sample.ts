import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreFeaturedCantonContractAdapter } from "../src";
import { keycloakTokenProvider, readPartySuffix } from "../src/utils";
import { getJsonApiUrl, readNetwork } from "./utils";

export async function coreSample() {
  const tokenProvider = () => keycloakTokenProvider();
  const partyId = `RedStoneOracleViewer::${readPartySuffix()}`;

  const client = new CantonClient(partyId, getJsonApiUrl(), tokenProvider, readNetwork());
  const adapter = new CoreFeaturedCantonContractAdapter(client);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreSample();

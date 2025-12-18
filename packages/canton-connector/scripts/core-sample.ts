import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreCantonContractAdapter } from "../src";
import { getJsonApiUrl, keycloakTokenProvider } from "./utils";

export async function coreSample() {
  const tokenProvider = () => keycloakTokenProvider();
  const partyId = `RedStoneOracleViewer:1220a0242797a84e1d8c492f1259b3f87d561fcbde2e4b2cebc4572ddfc515b44c28`;
  const client = new CantonClient(partyId, getJsonApiUrl(), tokenProvider);
  const coreId = "RedStoneAdapter-040";

  const adapter = new CoreCantonContractAdapter(client, coreId);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

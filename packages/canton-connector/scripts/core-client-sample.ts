import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreClientCantonContractAdapter } from "../src";
import { keycloakTokenProvider } from "../src/utils";
import { getJsonApiUrl, readNetwork } from "./utils";

const partyId = `Client::1220a0242797a84e1d8c492f1259b3f87d561fcbde2e4b2cebc4572ddfc515b44c28`;
const packageId = "3892dcfb99c55f2620dc38de2f62160b6dda44b67acd8b12af22b4cb652c8ee0";
const contractId =
  "006f39a996caf6f8fe7b885788b40d350349a48391de2a3fb3e656ff97262b2dd4ca121220d6e33c5d817e76a86c20a9e8a954f7c8d6e193838a340bb833d028dca6ead506";

export async function coreClientSample() {
  const tokenProvider = () => keycloakTokenProvider();

  const client = new CantonClient(partyId, getJsonApiUrl(), tokenProvider, readNetwork());
  const adapter = new CoreClientCantonContractAdapter(client, contractId, packageId);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreClientSample();

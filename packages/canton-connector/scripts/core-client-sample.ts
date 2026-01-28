import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreClientCantonContractAdapter, readPartySuffix } from "../src";
import { getJsonApiUrl, getTokenProvider, readNetwork, readUserId } from "./utils";

const partyId = `Client::${readPartySuffix()}`;
const packageId = "3892dcfb99c55f2620dc38de2f62160b6dda44b67acd8b12af22b4cb652c8ee0";
const contractId =
  "006f39a996caf6f8fe7b885788b40d350349a48391de2a3fb3e656ff97262b2dd4ca121220d6e33c5d817e76a86c20a9e8a954f7c8d6e193838a340bb833d028dca6ead506";

export async function coreClientSample() {
  const tokenProvider = getTokenProvider();

  const client = new CantonClient(
    partyId,
    getJsonApiUrl(),
    tokenProvider,
    readNetwork(),
    readUserId()
  );
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

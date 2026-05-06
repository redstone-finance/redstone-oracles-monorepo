import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v18";
const contractId =
  "003a6f1c0cd28b06baaeac77919b7367e29dc49e5441977adf8ef1f3926a74c2adca121220c74f36b168e04d70a1a508e9754b89b8e2b96449221066f188a9eb226ac68750";

export async function coreClientSample() {
  const client = makeDefaultClient();

  const adapter = new CoreClientCantonContractAdapter(
    client,
    makePartyId(partyName),
    contractId,
    packageId
  );
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreClientSample();

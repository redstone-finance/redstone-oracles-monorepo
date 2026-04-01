import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v12";
const contractId =
  "001320c279813aa91be498fe126ca31c15a29f63da289f3fa6b544de4351409112ca1212209f134675880eef2eba573666668dbdb9121bc6ed8775270587d5e7c7c39e56d9";

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

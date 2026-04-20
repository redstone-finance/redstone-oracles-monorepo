import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v17";
const contractId =
  "0023ea562371487a4c7993b4b9f63efc0b7034853990f854234a812b312ef328e9ca12122024f7dc9666fbf8a71e7a4b91658948ca5aa1ec0b389d3e49ae6e575b2373b7e1";

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

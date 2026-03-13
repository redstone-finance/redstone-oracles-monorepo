import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v2";
const contractId =
  "008a2bdfb2ed5fe9c0423a2e69249bd5304dbabdf8430f97b73da292b1e3cd837eca1212200a9b1951afdec72efba48a2a35b8f25a8b00016ce4057b1de1bbc544019df895";

export async function coreClientSample() {
  const client = makeDefaultClient(partyName);

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

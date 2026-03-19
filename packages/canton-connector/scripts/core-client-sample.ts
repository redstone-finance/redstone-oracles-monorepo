import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v11";
const contractId =
  "000854d4551d9d71896e508e2a85873554443613e4fdbdc9ff9d6fdbbdfc0803c6ca121220972b2074034e10ecd7084e285c84bbea24e3272c833e2687596f5bd00b1926e2";

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

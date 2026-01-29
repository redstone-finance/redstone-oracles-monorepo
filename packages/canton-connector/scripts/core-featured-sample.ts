import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreFeaturedCantonContractAdapter } from "../src";
import { makeDefaultClient } from "./utils";

export async function coreFeaturedSample() {
  const partyName = `RedStoneOracleViewer`;
  const client = makeDefaultClient(partyName);

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

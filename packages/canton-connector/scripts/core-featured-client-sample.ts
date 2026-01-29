import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreFeaturedClientCantonContractAdapter } from "../src";
import { makeDefaultClient } from "./utils";

const partyName = `Client`;
const packageId = "f1474b5ecd985e07e1bd561f54412e7db334d63d61d962c4d3c3801e2949e7b6";
const contractId =
  "005bed7fbb75069ff40226f9649f5b6c8b5e83a248b5d84b91099f86e4899663c3ca121220bd08f4a9b1f32c7b16e1a1ab54a5895061365efbc422633d6ec2aaa6e1f0f508";

export async function coreFeaturedClientSample() {
  const client = makeDefaultClient(partyName);

  const adapter = new CoreFeaturedClientCantonContractAdapter(client, contractId, packageId);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreFeaturedClientSample();

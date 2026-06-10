import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;

export async function coreClientSample() {
  const client = makeDefaultClient();

  const { contractId, packageId } =
    client.network === "mainnet"
      ? {
          packageId: "#redstone-core-v18",
          contractId:
            "000c33d6c01232d386ed5c3f3e39b9d599be4184fa8696a96f3b757ca2ce919f28ca1212208ffca3a44c7b9f49a9061a986ad2c5dc1ca404dfaea7b98a7071599496bc153b",
        }
      : {
          packageId: "#redstone-core-v19",
          contractId:
            "00032073ca9d2640b22348488f55ab5a76bb1e335a77c7ff6a42044c89e7d277aaca1212209ced9de133d13aed901b3149dc26faf381107f3803936bbe20bf4027190d2c69",
        };

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

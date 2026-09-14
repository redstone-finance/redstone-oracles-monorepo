import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;

export async function coreClientSample() {
  const client = makeDefaultClient();
  const { contractId, packageId } = client.getDefs().coreClient;

  const adapter = new CoreClientCantonContractAdapter(
    client,
    makePartyId(partyName),
    contractId,
    packageId
  );
  const authenticatedGateways = RedstoneCommon.getRequiredAuthenticatedGatewaysFromEnv();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    authenticatedGateways,
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreClientSample();

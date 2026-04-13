import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CoreClientCantonContractAdapter } from "../src";
import { makeDefaultClient, makePartyId } from "./utils";

const partyName = `Client`;
const packageId = "#redstone-core-v16";
const contractId =
  "00a5617c7a9d0053fdefdc195aa0578328b5025f5baa34184f0b5dbdde87a4a938ca121220463f1a962e87b712a7b1a169aba57e42d24786e818bfc1066cd486e715c91ede";

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

import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { CantonClient, CoreClientCantonContractAdapter } from "../src";
import { getJsonApiUrl, keycloakTokenProvider } from "./utils";

export async function coreSample() {
  const tokenProvider = () => keycloakTokenProvider();
  const partyId = `Client::1220a0242797a84e1d8c492f1259b3f87d561fcbde2e4b2cebc4572ddfc515b44c28`;
  const templateId = "5e14917b311c528ce677ded59d600013f5d3112409c3fe6df218f7bc7a580d7e";
  const contractId =
    "00d6f620f324603f6340a19ad276199abee18c099651781255bf563c666cd2deeaca12122052d357a7895859039d3d8493addd7d6ac3e4bd66ae050e153470df0fe3c2a543";

  const client = new CantonClient(partyId, getJsonApiUrl(), tokenProvider);
  const adapter = new CoreClientCantonContractAdapter(client, contractId, templateId);
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  console.log(await adapter.getPricesFromPayload(paramsProvider));
}

void coreSample();

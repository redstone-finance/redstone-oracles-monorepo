import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiBlockchainService,
  SuiClientBuilders,
  SuiNetworkSchema,
  SuiWriteContractAdapter,
} from "../src";
import { getGraphQLUrls, getRpcUrls } from "./get-rpc-urls";

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const rpcUrls = await getRpcUrls(network);
  const graphqlUrls = getGraphQLUrls(network);

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["BTC", "ETH", "LBTC_FUNDAMENTAL"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const suiClient = SuiClientBuilders.clientBuilder()
    .withSuiNetwork(network)
    .withRpcUrls(rpcUrls)
    .withGraphqlUrls(graphqlUrls)
    .withFullnodeUrl()
    .build();

  const adapter = new SuiWriteContractAdapter(suiClient, makeSuiKeypair(), readSuiConfig(network));

  await sampleRun(paramsProvider, adapter, new SuiBlockchainService(suiClient));
}

void main();

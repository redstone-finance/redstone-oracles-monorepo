import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiPricesContractConnector,
} from "../src";
import { getRpcUrls } from "./get-rpc-urls";

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const rpcUrls = await getRpcUrls(network);
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["BTC", "ETH", "LBTC_FUNDAMENTAL"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const suiClient = new SuiClientBuilder()
    .withSuiNetwork(network)
    .withRpcUrls(rpcUrls)
    .withFullnodeUrl()
    .build();

  const suiContractConnector = new SuiPricesContractConnector(
    suiClient,
    readSuiConfig(network),
    makeSuiKeypair()
  );

  await sampleRun(paramsProvider, suiContractConnector);
}

void main();

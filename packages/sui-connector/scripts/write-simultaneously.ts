import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiContractConnector,
  SuiNetworkSchema,
} from "../src";
import { getRpcUrls } from "./get-rpc-urls";

async function prepareParamsProviderWithData(requestParams: DataPackagesRequestParams) {
  const cache = new DataPackagesResponseCache();
  const paramsProvider = new ContractParamsProvider(requestParams, cache);
  const data = await paramsProvider.requestDataPackages();
  cache.update(data, requestParams);

  return paramsProvider;
}

export async function writeSimultaneously() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const rpcUrls = await getRpcUrls(network);
  const suiClient = new SuiClientBuilder().withSuiNetwork(network).withRpcUrls(rpcUrls).build();

  const requestParams: DataPackagesRequestParams = {
    dataPackagesIds: ["ETH"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    enableEnhancedLogs: true,
  };

  const suiContractConnector = new SuiContractConnector(
    suiClient,
    readSuiConfig(network),
    makeSuiKeypair()
  );

  const paramsProvider = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(11_000);
  const paramsProvider2 = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(3_000);

  await Promise.allSettled(
    [paramsProvider2, paramsProvider].map((paramsProvider) =>
      suiContractConnector.writePricesFromPayloadToContract(paramsProvider)
    )
  );
}

async function main() {
  await writeSimultaneously();
}

void main();

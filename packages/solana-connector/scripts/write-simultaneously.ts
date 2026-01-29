import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { hexlify } from "ethers/lib/utils";
import { readCluster, SolanaConnectionBuilder, SolanaContractConnector } from "../src";
import { readProgramAddress } from "./consts";
import { getRpcUrls } from "./get-rpc-urls";
import { readKeypair } from "./utils";

async function prepareParamsProviderWithData(requestParams: DataPackagesRequestParams) {
  const cache = new DataPackagesResponseCache();
  const paramsProvider = new ContractParamsProvider(requestParams, cache);
  const data = await paramsProvider.requestDataPackages();
  cache.update(data, requestParams);

  return paramsProvider;
}

export async function writeSimultaneously() {
  const keypair = readKeypair();
  console.log("Public key:", hexlify(keypair.publicKey.toBytes()));
  const rpcUrls = await getRpcUrls();
  const connection = new SolanaConnectionBuilder().withRpcUrls(rpcUrls).build();

  const requestParams: DataPackagesRequestParams = {
    dataPackagesIds: ["ETH"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    enableEnhancedLogs: true,
  };

  const solanaContractConnector = new SolanaContractConnector(
    connection,
    readProgramAddress(readCluster()),
    keypair
  );

  const paramsProvider = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(10000);
  const paramsProvider2 = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(3000);

  await Promise.allSettled(
    [paramsProvider2, paramsProvider].map((paramsProvider) =>
      solanaContractConnector.writePricesFromPayloadToContract(paramsProvider)
    )
  );
}

async function main() {
  await writeSimultaneously();
}

void main();

import { writeSimultaneously } from "@redstone-finance/multichain-kit";
import { DataPackagesRequestParams, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiWriteContractAdapter,
} from "../src";
import { getRpcUrls } from "./get-rpc-urls";

async function writeSimultaneouslyToSui() {
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

  const adapter = new SuiWriteContractAdapter(suiClient, makeSuiKeypair(), readSuiConfig(network));

  await writeSimultaneously(requestParams, adapter);
}

async function main() {
  await writeSimultaneouslyToSui();
}

void main();

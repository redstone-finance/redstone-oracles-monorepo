import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiPricesContractConnector,
} from "../src";

const OTHER_RPC_URLS = [
  "https://rpc.ankr.com/sui",
  "https://sui-mainnet.public.blastapi.io",
  "https://1rpc.io/sui",
  "https://api.blockeden.xyz/sui/jBQLBdEWG4xk6fmaWshS",
  "https://sui.blockpi.network/v1/rpc/public",
  "https://sui-mainnet-endpoint.blockvision.org/",
  "https://go.getblock.io/5d7b382a4a5f4cb19a3fa630a8fd4439",
  "https://endpoints.omniatech.io/v1/sui/mainnet/public",
];

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const suiClient = new SuiClientBuilder()
    .withNetwork(network)
    .withRpcUrls(OTHER_RPC_URLS)
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

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
  "https://rpc.ankr.com/sui_testnet",
  "https://sui-testnet-rpc.publicnode.com",
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

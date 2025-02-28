import {
  fetchChainConfigs,
  getChainConfigByChainId,
} from "@redstone-finance/chain-configs";
import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  getSuiChainId,
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiPricesContractConnector,
} from "../src";

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const rpcUrls = getChainConfigByChainId(
    await fetchChainConfigs(),
    getSuiChainId(network),
    "sui"
  ).publicRpcUrls;

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["BTC", "ETH", "LBTC_FUNDAMENTAL"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const suiClient = new SuiClientBuilder()
    .withNetwork(network)
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

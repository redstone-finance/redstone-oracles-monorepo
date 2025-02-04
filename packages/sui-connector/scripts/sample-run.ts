import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  DEFAULT_GAS_BUDGET,
  makeSuiKeypair,
  readSuiConfig,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiPricesContractConnector,
} from "../src";

const OTHER_RPC_URL = "https://rpc.ankr.com/sui_testnet";

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["BTC"],
  });

  const suiClient = await new SuiClientBuilder()
    .withNetwork(network)
    .withFullnodeUrl()
    .withRpcUrl(OTHER_RPC_URL)
    .buildAndVerify();

  const suiContractConnector = new SuiPricesContractConnector(
    suiClient,
    {
      ...readSuiConfig(network),
      writePricesTxGasBudget: 10n * DEFAULT_GAS_BUDGET,
    },
    makeSuiKeypair()
  );

  await sampleRun(paramsProvider, suiContractConnector);
}

void main();

import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import "dotenv/config";
import { connectToCluster, SolanaContractConnector } from "../src";
import { RDS_PROGRAM_ADDRESS } from "./sample-deploy";
import { readKeypair } from "./utils";

async function main() {
  const connection = connectToCluster();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const solanaContractConnector = new SolanaContractConnector(
    connection,
    RDS_PROGRAM_ADDRESS,
    readKeypair()
  );

  await sampleRun(paramsProvider, solanaContractConnector);
}

void main();

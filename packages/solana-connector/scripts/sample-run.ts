import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import "dotenv/config";
import { SolanaContractConnector } from "../src";
import { connectToCluster, readIdl, readKeyPair } from "./utils";

async function main() {
  const connection = connectToCluster();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const solanaContractConnector = new SolanaContractConnector(
    connection,
    readKeyPair(),
    readIdl()
  );

  await sampleRun(paramsProvider, solanaContractConnector);
}

void main();

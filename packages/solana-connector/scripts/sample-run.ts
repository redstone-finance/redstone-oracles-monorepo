import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import "dotenv/config";
import { connectToCluster, SolanaContractConnector } from "../src";
import { readKeypair } from "./utils";

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
    "CvFXyHhjA5QBm1BVMibkZXT12rCq78GZPMzK5tWSagB",
    readKeypair()
  );

  await sampleRun(paramsProvider, solanaContractConnector);
}

void main();

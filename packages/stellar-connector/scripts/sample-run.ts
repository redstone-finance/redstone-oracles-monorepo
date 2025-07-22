import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { StellarContractConnector } from "../src";
import { loadAdapterId, makeKeypair, makeServer } from "./utils";

async function main() {
  const server = makeServer();
  const keypair = makeKeypair();

  const adapterId = loadAdapterId();

  const connector = new StellarContractConnector(server, keypair, adapterId);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  await sampleRun(paramsProvider, connector);
}

void main();

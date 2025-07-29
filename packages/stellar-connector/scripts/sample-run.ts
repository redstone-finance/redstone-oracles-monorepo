import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import {
  StellarPriceAdapterContractConnector,
  StellarPriceFeedContractConnector,
} from "../src";
import { FEEDS } from "./consts";
import {
  loadAdapterId,
  loadPriceFeedId,
  makeKeypair,
  makeServer,
} from "./utils";

async function main() {
  const server = makeServer();
  const keypair = makeKeypair();

  const adapterId = loadAdapterId();

  const connector = new StellarPriceAdapterContractConnector(
    server,
    keypair,
    adapterId
  );

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: FEEDS,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new StellarPriceFeedContractConnector(
    server,
    loadPriceFeedId("ETH"),
    keypair.publicKey()
  );

  await sampleRun(paramsProvider, connector, ethPriceFeedConnector);
}

void main().catch((err) => console.log(err));

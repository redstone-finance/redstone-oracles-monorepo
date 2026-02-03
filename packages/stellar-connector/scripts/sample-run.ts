import { BackwardCompatibleConnector } from "@redstone-finance/multichain-kit";
import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import {
  makeKeypair,
  PriceFeedStellarContractConnector,
  StellarClientBuilder,
  StellarContractConnector,
} from "../src";
import { FEEDS } from "./consts";
import { getRpcUrls } from "./get-rpc-urls";
import { loadAdapterId, loadPriceFeedId, readNetwork } from "./utils";

const WITH_TTL_EXTENDING = false as boolean;

async function main() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();
  const network = readNetwork();

  const client = new StellarClientBuilder()
    .withStellarNetwork(network)
    .withRpcUrls(await getRpcUrls(network))
    .build();
  const connector = new StellarContractConnector(client, adapterId, keypair);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: FEEDS,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  if (WITH_TTL_EXTENDING) {
    await connector.writePricesFromPayloadToContract(paramsProvider, {
      allFeedIds: FEEDS,
      feedAddresses: Object.fromEntries(FEEDS.map((feedId) => [feedId, loadPriceFeedId(feedId)])),
    });

    return;
  }

  const ethPriceFeedConnector = new PriceFeedStellarContractConnector(client, loadPriceFeedId());

  const oldConnector = new BackwardCompatibleConnector(connector);

  await sampleRun(paramsProvider, oldConnector, ethPriceFeedConnector);
}

void main().catch((err) => console.log(err));

import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import {
  makeKeypair,
  PriceAdapterStellarContractConnector,
  PriceFeedStellarContractConnector,
  StellarClientBuilder,
} from "../src";
import { FEEDS } from "./consts";
import { loadAdapterId, loadPriceFeedId, readNetwork, readUrl } from "./utils";

const WITH_TTL_EXTENDING = false as boolean;

async function main() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const connector = new PriceAdapterStellarContractConnector(client, adapterId, keypair);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: FEEDS,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  if (WITH_TTL_EXTENDING) {
    const adapter = await connector.getAdapter();

    await adapter.writePricesFromPayloadToContract(paramsProvider, {
      allFeedIds: FEEDS,
      feedAddresses: Object.fromEntries(FEEDS.map((feedId) => [feedId, loadPriceFeedId(feedId)])),
    });

    return;
  }

  const ethPriceFeedConnector = new PriceFeedStellarContractConnector(
    client,
    loadPriceFeedId(),
    keypair
  );

  await sampleRun(paramsProvider, connector, ethPriceFeedConnector);
}

void main().catch((err) => console.log(err));

import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { rpc } from "@stellar/stellar-sdk";
import { StellarContractConnector, StellarPriceFeed } from "../src";
import { FEEDS } from "./consts";
import {
  loadAdapterId,
  loadPriceFeedId,
  makeKeypair,
  makeServer,
} from "./utils";

async function readPriceFeed(server: rpc.Server, feed: string, sender: string) {
  const priceFeedId = loadPriceFeedId(feed);

  const priceFeed = new StellarPriceFeed(server, priceFeedId, sender);

  const decimals = await priceFeed.decimals();
  const priceData = await priceFeed.readPriceData();
  const timestamp = await priceFeed.readTimestamp();
  const price = await priceFeed.readPrice();
  const priceAndTimestamp = await priceFeed.readPriceAndTimestamp();

  console.log(`===Reading price feed for ${feed}===`);
  console.log({
    price,
    decimals,
    priceAndTimestamp,
    timestamp,
    priceData,
  });
}

async function main() {
  const server = makeServer();
  const keypair = makeKeypair();

  const adapterId = loadAdapterId();

  const connector = new StellarContractConnector(server, keypair, adapterId);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: FEEDS,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  await sampleRun(paramsProvider, connector);

  for (const feed of FEEDS) {
    await readPriceFeed(server, feed, keypair.publicKey());
  }
}

void main().catch((err) => console.log(err));

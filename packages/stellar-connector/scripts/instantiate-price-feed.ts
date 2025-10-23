import { Contract } from "@stellar/stellar-sdk";
import {
  makeKeypair,
  PriceFeedStellarContractAdapter,
  StellarClient,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarTxDeliveryMan,
} from "../src";
import { PRICE_FEED_WASM_HASH } from "./consts";
import { readNetwork, readPriceFeedId, readUrl, savePriceFeedId } from "./utils";

export async function initPriceFeed(
  client: StellarClient,
  contractId: string,
  txDeliveryMan: StellarTxDeliveryMan,
  feedId: string
) {
  await new PriceFeedStellarContractAdapter(client, new Contract(contractId), txDeliveryMan).init(
    await txDeliveryMan.getPublicKey(),
    feedId
  );

  console.log(`🚀 price feed for ${feedId} contract deployed at: ${contractId}`);

  savePriceFeedId(contractId, feedId);
}

async function instantiatePriceFeed(
  deployer: StellarContractDeployer,
  client: StellarClient,
  txDeliveryMan: StellarTxDeliveryMan,
  feedId = readPriceFeedId(),
  adapterWasmHash = PRICE_FEED_WASM_HASH
) {
  const contractId = (
    await deployer.createContract(Buffer.from(adapterWasmHash, "hex"))
  ).toString();

  await initPriceFeed(client, contractId, txDeliveryMan, feedId);
}

async function main() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);
  const deployer = new StellarContractDeployer(client, txDeliveryMan);

  await instantiatePriceFeed(deployer, client, txDeliveryMan);
}

void main();

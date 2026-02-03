import { Contract } from "@stellar/stellar-sdk";
import {
  makeKeypair,
  StellarClient,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarContractOps,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import * as XdrUtils from "../src/XdrUtils";
import { MULTISIG_ADDRESS, PRICE_FEED_WASM_HASH } from "./consts";
import { readNetwork, readPriceFeedId, readUrl, savePriceFeedId } from "./utils";

export async function initPriceFeed(
  client: StellarClient,
  contractId: string,
  sender: StellarOperationSender,
  feedId: string
) {
  await new StellarContractOps(client, new Contract(contractId), sender).initContract(
    MULTISIG_ADDRESS,
    XdrUtils.stringToScVal(feedId)
  );

  console.log(`🚀 price feed for ${feedId} contract deployed at: ${contractId}`);

  savePriceFeedId(contractId, feedId);
}

async function instantiatePriceFeed(
  deployer: StellarContractDeployer,
  client: StellarClient,
  sender: StellarOperationSender,
  feedId = readPriceFeedId(),
  adapterWasmHash = PRICE_FEED_WASM_HASH
) {
  const contractId = (
    await deployer.createContract(Buffer.from(adapterWasmHash, "hex"))
  ).toString();

  await initPriceFeed(client, contractId, sender, feedId);
}

async function main() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const sender = new StellarOperationSender(new StellarSigner(keypair), client);
  const deployer = new StellarContractDeployer(client, sender);

  await instantiatePriceFeed(deployer, client, sender);
}

void main();

import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { instantiatePriceFeed } from "./instantiate-price-feed-utils";
import { readNetwork, readUrl } from "./utils";

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

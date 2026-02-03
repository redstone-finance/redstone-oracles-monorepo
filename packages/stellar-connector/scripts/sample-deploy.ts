import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  StellarClient,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarContractOps,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { FEEDS } from "./consts";
import { initPriceFeed } from "./instantiate-price-feed";
import {
  PRICE_ADAPTER,
  PRICE_FEED,
  readNetwork,
  readUrl,
  saveAdapterId,
  wasmFilePath,
} from "./utils";

async function deployAdapter(
  deployer: StellarContractDeployer,
  client: StellarClient,
  sender: StellarOperationSender
) {
  execSync(`make build`, { stdio: "inherit" });

  const adapterDeployResult = await deployer.deploy(wasmFilePath(PRICE_ADAPTER));

  await new StellarContractOps(
    client,
    new Contract(adapterDeployResult.contractId),
    sender
  ).initContract(await sender.getPublicKey());

  console.log(`🚀 adapter contract deployed at: ${adapterDeployResult.contractId}`);
  saveAdapterId(adapterDeployResult.contractId);

  return adapterDeployResult.contractId;
}

async function deployPriceFeed(
  deployer: StellarContractDeployer,
  client: StellarClient,
  sender: StellarOperationSender,
  adapterAddress: string,
  feedId: string
) {
  execSync(`make set-adapter-address ADDRESS=${adapterAddress}`, {
    stdio: "inherit",
  });
  execSync(`make build`, { stdio: "inherit" });

  const priceFeedDeployResult = await deployer.deploy(wasmFilePath(PRICE_FEED));

  await initPriceFeed(client, priceFeedDeployResult.contractId, sender, feedId);
}

async function sampleDeploy() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const sender = new StellarOperationSender(new StellarSigner(keypair), client);

  const deployer = new StellarContractDeployer(client, sender);
  const adapterId = await deployAdapter(deployer, client, sender);

  for (const feed of FEEDS) {
    await deployPriceFeed(deployer, client, sender, adapterId, feed);
  }
}

void sampleDeploy();

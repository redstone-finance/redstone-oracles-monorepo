import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  PriceAdapterStellarContractAdapter,
  StellarClient,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarTxDeliveryMan,
} from "../src";
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
  txDeliveryMan: StellarTxDeliveryMan
) {
  execSync(`make build`, { stdio: "inherit" });

  const adapterDeployResult = await deployer.deploy(wasmFilePath(PRICE_ADAPTER));

  await new PriceAdapterStellarContractAdapter(
    client,
    new Contract(adapterDeployResult.contractId),
    txDeliveryMan
  ).init(await txDeliveryMan.getPublicKey());

  console.log(`🚀 adapter contract deployed at: ${adapterDeployResult.contractId}`);
  saveAdapterId(adapterDeployResult.contractId);

  return adapterDeployResult.contractId;
}

async function deployPriceFeed(
  deployer: StellarContractDeployer,
  client: StellarClient,
  txDeliveryMan: StellarTxDeliveryMan,
  adapterAddress: string,
  feedId: string
) {
  execSync(`make set-adapter-address ADDRESS=${adapterAddress}`, {
    stdio: "inherit",
  });
  execSync(`make build`, { stdio: "inherit" });

  const priceFeedDeployResult = await deployer.deploy(wasmFilePath(PRICE_FEED));

  await initPriceFeed(client, priceFeedDeployResult.contractId, txDeliveryMan, feedId);
}

async function sampleDeploy() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);
  const deployer = new StellarContractDeployer(client, txDeliveryMan);
  const adapterId = await deployAdapter(deployer, client, txDeliveryMan);

  for (const feed of FEEDS) {
    await deployPriceFeed(deployer, client, txDeliveryMan, adapterId, feed);
  }
}

void sampleDeploy();

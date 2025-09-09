import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  PriceAdapterStellarContractAdapter,
  PriceFeedStellarContractAdapter,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarRpcClient,
  StellarTxDeliveryMan,
} from "../src";
import { FEEDS } from "./consts";
import {
  PRICE_ADAPTER,
  PRICE_FEED,
  readNetwork,
  readUrl,
  saveAdapterId,
  savePriceFeedId,
  wasmFilePath,
} from "./utils";

async function deployAdapter(
  deployer: StellarContractDeployer,
  client: StellarRpcClient,
  txDeliveryMan: StellarTxDeliveryMan
) {
  execSync(`make build`, { stdio: "inherit" });

  const adapterDeployResult = await deployer.deploy(
    wasmFilePath(PRICE_ADAPTER)
  );

  await new PriceAdapterStellarContractAdapter(
    client,
    new Contract(adapterDeployResult.contractId),
    txDeliveryMan
  ).init(await txDeliveryMan.getPublicKey());

  console.log(
    `🚀 adapter contract deployed at: ${adapterDeployResult.contractId}`
  );
  saveAdapterId(adapterDeployResult.contractId);

  return adapterDeployResult.contractId;
}

async function deployPriceFeed(
  deployer: StellarContractDeployer,
  rpcClient: StellarRpcClient,
  txDeliveryMan: StellarTxDeliveryMan,
  adapterAddress: string,
  feedId: string
) {
  execSync(`make set-adapter-address ADDRESS=${adapterAddress}`, {
    stdio: "inherit",
  });
  execSync(`make build`, { stdio: "inherit" });

  const priceFeedDeployResult = await deployer.deploy(wasmFilePath(PRICE_FEED));
  await new PriceFeedStellarContractAdapter(
    rpcClient,
    new Contract(priceFeedDeployResult.contractId),
    txDeliveryMan
  ).init(await txDeliveryMan.getPublicKey(), feedId);

  console.log(
    `🚀 price feed for ${feedId} contract deployed at: ${priceFeedDeployResult.contractId}`
  );
  savePriceFeedId(priceFeedDeployResult.contractId, feedId);
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

import { Contract, Keypair } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarPriceFeedContractAdapter,
  StellarPricesContractAdapter,
  StellarRpcClient,
} from "../src";
import { FEEDS } from "./consts";
import {
  PRICE_ADAPTER,
  PRICE_FEED,
  readDeployDir,
  readNetwork,
  readUrl,
  saveAdapterId,
  savePriceFeedId,
  wasmFilePath,
} from "./utils";

async function deployAdapter(
  deployer: StellarContractDeployer,
  client: StellarRpcClient,
  keypair: Keypair
) {
  execSync(`make -C ${readDeployDir()} build`, { stdio: "inherit" });

  const adapterDeployResult = await deployer.deploy(
    wasmFilePath(PRICE_ADAPTER)
  );

  await new StellarPricesContractAdapter(
    client,
    new Contract(adapterDeployResult.contractId),
    keypair
  ).init(keypair.publicKey());

  console.log(
    `🚀 adapter contract deployed at: ${adapterDeployResult.contractId}`
  );
  saveAdapterId(adapterDeployResult.contractId);

  return adapterDeployResult.contractId;
}

async function deployPriceFeed(
  deployer: StellarContractDeployer,
  rpcClient: StellarRpcClient,
  keypair: Keypair,
  adapterAddress: string,
  feedId: string
) {
  const priceFeedDeployResult = await deployer.deploy(wasmFilePath(PRICE_FEED));
  await new StellarPriceFeedContractAdapter(
    rpcClient,
    new Contract(priceFeedDeployResult.contractId),
    keypair.publicKey()
  ).init(keypair.publicKey(), feedId, adapterAddress, keypair);

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
  const deployer = new StellarContractDeployer(client, keypair);

  const adapterId = await deployAdapter(deployer, client, keypair);

  for (const feed of FEEDS) {
    await deployPriceFeed(deployer, client, keypair, adapterId, feed);
  }
}

void sampleDeploy();

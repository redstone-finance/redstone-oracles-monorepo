import { Contract, Keypair } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  StellarClientBuilder,
  StellarContractDeployer,
  StellarPriceFeedContractAdapter,
  StellarPricesContractAdapter,
  StellarRpcClient,
  makeKeypair,
} from "../src";
import { FEEDS } from "./consts";
import {
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
    wasmFilePath("redstone_adapter")
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
  const priceFeedDeployResult = await deployer.deploy(
    wasmFilePath("price_feed")
  );
  await new StellarPriceFeedContractAdapter(
    rpcClient,
    new Contract(priceFeedDeployResult.contractId),
    keypair.publicKey()
  ).init(feedId, adapterAddress, keypair);

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

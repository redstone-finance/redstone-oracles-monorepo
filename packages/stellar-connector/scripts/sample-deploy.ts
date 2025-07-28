import { Keypair, rpc } from "@stellar/stellar-sdk";
import {
  ContractDeployer,
  StellarContractAdapter,
  StellarPriceFeed,
} from "../src";
import { FEEDS } from "./consts";
import {
  makeKeypair,
  makeServer,
  saveAdapterId,
  savePriceFeedId,
  wasmFilePath,
} from "./utils";

async function deployAdapter(
  deployer: ContractDeployer,
  server: rpc.Server,
  keypair: Keypair
) {
  const adapterDeployResult = await deployer.deploy(
    wasmFilePath("redstone_adapter")
  );

  await new StellarContractAdapter(
    server,
    keypair,
    adapterDeployResult.contractId
  ).init(keypair.publicKey());

  console.log(
    `🚀 adapter contract deployed at: ${adapterDeployResult.contractId}`
  );
  saveAdapterId(adapterDeployResult.contractId);

  return adapterDeployResult.contractId;
}

async function deployPriceFeed(
  deployer: ContractDeployer,
  server: rpc.Server,
  keypair: Keypair,
  adapterAddress: string,
  feedId: string
) {
  const priceFeedDeployResult = await deployer.deploy(
    wasmFilePath("price_feed")
  );
  await new StellarPriceFeed(
    server,
    priceFeedDeployResult.contractId,
    keypair.publicKey()
  ).init(feedId, adapterAddress, keypair);

  console.log(
    `🚀 price feed for ${feedId} contract deployed at: ${priceFeedDeployResult.contractId}`
  );
  savePriceFeedId(priceFeedDeployResult.contractId, feedId);
}

async function sampleDeploy() {
  const server = makeServer();
  const keypair = makeKeypair();

  const deployer = new ContractDeployer(server, keypair);

  const adapterId = await deployAdapter(deployer, server, keypair);

  for (const feed of FEEDS) {
    await deployPriceFeed(deployer, server, keypair, adapterId, feed);
  }
}

void sampleDeploy();

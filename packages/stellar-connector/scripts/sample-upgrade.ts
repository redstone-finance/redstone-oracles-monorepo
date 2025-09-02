import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  StellarClientBuilder,
  StellarContractDeployer,
  StellarPricesContractAdapter,
  makeKeypair,
} from "../src";
import {
  loadAdapterId,
  readDeployDir,
  readNetwork,
  readUrl,
  wasmFilePath,
} from "./utils";

async function sampleUpgrade() {
  const adapterId = loadAdapterId();
  const contract = new Contract(adapterId);
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const deployer = new StellarContractDeployer(client, keypair);
  const adapter = new StellarPricesContractAdapter(client, contract, keypair);

  execSync(`make -C ${readDeployDir()} build`, { stdio: "inherit" });

  const wasmHash = await deployer.upload(wasmFilePath("redstone_adapter"));
  await adapter.upgrade(wasmHash);

  console.log(
    `🚀 adapter contract upgraded at: ${adapterId}, new wasmHash: ${wasmHash.toString("hex")}`
  );
}

void sampleUpgrade();

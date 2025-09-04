import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractAdapter,
  StellarContractDeployer,
  StellarTxDeliveryMan,
} from "../src";
import {
  loadContractId,
  loadContractName,
  readDeployDir,
  readNetwork,
  readUrl,
  wasmFilePath,
} from "./utils";

async function sampleUpgrade(contractId = loadContractId()) {
  const contract = new Contract(contractId);
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);

  const deployer = new StellarContractDeployer(client, txDeliveryMan);
  const adapter = new StellarContractAdapter(client, contract, txDeliveryMan);

  execSync(`make -C ${readDeployDir()} build`, { stdio: "inherit" });

  const contractName = loadContractName();
  const wasmHash = await deployer.upload(wasmFilePath(contractName));
  await adapter.upgrade(wasmHash);

  console.log(
    `🚀 ${contractName} contract upgraded at: ${contractId}, new wasmHash: ${wasmHash.toString("hex")}`
  );
}

void sampleUpgrade();

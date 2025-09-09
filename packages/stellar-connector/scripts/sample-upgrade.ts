import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  PriceAdapterStellarContractAdapter,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarTxDeliveryMan,
} from "../src";
import {
  loadContractId,
  loadContractName,
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
  const adapter = new PriceAdapterStellarContractAdapter(
    client,
    contract,
    txDeliveryMan
  );

  execSync(`make build`, { stdio: "inherit" });

  const contractName = loadContractName();
  const wasmHash = await deployer.upload(wasmFilePath(contractName));

  console.log(`upgrade`, await adapter.upgrade(wasmHash));

  console.log(
    `🚀 ${contractName} contract upgraded at: ${contractId}, new wasmHash: ${wasmHash.toString("hex")}`
  );
}

void sampleUpgrade();

import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarContractOps,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { loadContractId, loadContractName, readNetwork, readUrl, wasmFilePath } from "./utils";

export async function getSampleUpgradeTx(contractId: string) {
  const contract = new Contract(contractId);
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const sender = new StellarOperationSender(new StellarSigner(keypair), client);

  const deployer = new StellarContractDeployer(client, sender);
  const ops = new StellarContractOps(client, contract, sender);

  execSync(`make build`, { stdio: "inherit" });

  const contractName = loadContractName();
  const wasmHash = await deployer.upload(wasmFilePath(contractName));
  return { ops, wasmHash };
}

async function sampleUpgrade(contractId = loadContractId()) {
  const contractName = loadContractName();
  const { ops, wasmHash } = await getSampleUpgradeTx(contractId);

  console.log(`upgrade`, await ops.upgrade(wasmHash));

  console.log(
    `🚀 ${contractName} contract upgraded at: ${contractId}, new wasmHash: ${wasmHash.toString("hex")}`
  );
}

if (require.main === module) {
  void sampleUpgrade();
}

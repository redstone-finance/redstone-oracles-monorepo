import { Contract } from "@stellar/stellar-sdk";
import { execSync } from "node:child_process";
import {
  makeKeypair,
  PriceAdapterStellarContractAdapter,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarTxDeliveryMan,
} from "../../src";
import { loadContractId, loadContractName, readNetwork, readUrl, wasmFilePath } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";

const FEE_STROOPS = 1000;

async function sampleUpgrade(contractId = loadContractId()) {
  const contract = new Contract(contractId);
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);

  const deployer = new StellarContractDeployer(client, txDeliveryMan);
  const adapter = new PriceAdapterStellarContractAdapter(client, contract, txDeliveryMan);

  execSync(`make build`, { stdio: "inherit" });

  const contractName = loadContractName();
  const wasmHash = await deployer.upload(wasmFilePath(contractName));
  const tx = await adapter.upgradeTx(MULTISIG_ADDRESS, wasmHash, FEE_STROOPS);

  console.log(tx.toEnvelope().toXDR("hex"));
}

void sampleUpgrade();

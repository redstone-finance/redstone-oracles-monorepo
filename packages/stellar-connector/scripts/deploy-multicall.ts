import { execSync } from "node:child_process";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractDeployer,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { MULTICALL, readNetwork, readUrl, saveMulticallId, wasmFilePath } from "./utils";

async function deployMulticall(deployer: StellarContractDeployer) {
  execSync(`make build`, { stdio: "inherit" });

  const multicallDeployResult = await deployer.deploy(wasmFilePath(MULTICALL));

  console.log(`🚀 multicall contract deployed at: ${multicallDeployResult.contractId}`);
  saveMulticallId(multicallDeployResult.contractId);

  return multicallDeployResult.contractId;
}

async function main() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const sender = new StellarOperationSender(new StellarSigner(keypair), client);

  const deployer = new StellarContractDeployer(client, sender);

  await deployMulticall(deployer);
}

void main();

import { ContractDeployer } from "../src";
import { makeKeypair, makeServer, saveAdapterId } from "./utils";

const WASM_FILEPATH =
  "./stellar/target/wasm32v1-none/release/redstone_adapter.wasm";

async function sampleDeploy() {
  const server = makeServer();
  const keypair = makeKeypair();

  const deployer = new ContractDeployer(server, keypair, WASM_FILEPATH);

  const deployResult = await deployer.deploy(keypair.publicKey());

  console.log(`🚀 contract deployed at: ${deployResult.contractId}`);
  saveAdapterId(deployResult.contractId);
}

void sampleDeploy();

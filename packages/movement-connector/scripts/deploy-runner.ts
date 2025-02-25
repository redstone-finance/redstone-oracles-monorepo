import "dotenv/config";
import { makeAptosAccount } from "../src";
import {
  deploy,
  getEnvContractName,
  prepareDepAddresses,
} from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const contractName = getEnvContractName();
  const aptos = makeAptos();
  const account = makeAptosAccount();
  await deploy(aptos, account, contractName, prepareDepAddresses(contractName));
}

void main();

import "dotenv/config";
import { makeAptosAccount } from "../src";
import { deploy, prepareDepAddresses } from "./deploy-utils";
import { getEnvContractName } from "./get-env";
import { makeAptos } from "./utils";

async function main() {
  const contractName = getEnvContractName();
  const aptos = makeAptos();
  const account = makeAptosAccount();

  await deploy(aptos, account, contractName, prepareDepAddresses(contractName));
}

void main();

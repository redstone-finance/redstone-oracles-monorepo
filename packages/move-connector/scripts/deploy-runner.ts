import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { makeAptosAccount } from "../src";
import { deploy, prepareDepAddresses, readAddress } from "./deploy-utils";
import { getEnvContractName } from "./get-env";
import { makeAptos } from "./utils";

async function main() {
  const contractName = getEnvContractName();
  const aptos = makeAptos();
  const account = makeAptosAccount();

  const isUpgrade = RedstoneCommon.getFromEnv(
    "IS_UPGRADE",
    z.boolean().default(false)
  );
  const currentObjectAddress = isUpgrade
    ? readAddress(contractName)
    : undefined;

  await deploy(
    aptos,
    account,
    contractName,
    prepareDepAddresses(contractName),
    currentObjectAddress
  );
}

void main();

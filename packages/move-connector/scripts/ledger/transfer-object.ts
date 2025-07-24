import { Account, AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { makeAptosAccount } from "../../src";
import { readAddress } from "../deploy-utils";
import { getEnvContractName } from "../get-env";
import { MovementPackageTxBuilder } from "../package";
import { handleTx, makeAptos, promptForConfirmation } from "../utils";
import { MULTI_SIG_ADDRESS } from "./const";

async function transferObject(
  aptos: Aptos,
  builder: MovementPackageTxBuilder,
  account: Account,
  multiSigAddress: AccountAddress,
  objectAddress: AccountAddress
) {
  const transferTx = await builder.objectTransferFunction(
    account.accountAddress,
    objectAddress,
    multiSigAddress
  );
  await handleTx(aptos, transferTx, account);
}

async function main() {
  const aptos = makeAptos();
  const account = makeAptosAccount();
  const builder = new MovementPackageTxBuilder(aptos);
  const objectAddress = readAddress();
  const contractName = getEnvContractName();

  console.log(
    `Transfer ${contractName} object ${objectAddress.toString()} to multi-sig account: ${MULTI_SIG_ADDRESS}`
  );
  await promptForConfirmation();

  await transferObject(
    aptos,
    builder,
    account,
    AccountAddress.from(MULTI_SIG_ADDRESS),
    objectAddress
  );
}

void main();

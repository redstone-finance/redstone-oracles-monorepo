import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import fs from "fs";
import {
  getTransactionJsonPath,
  prepareDepAddresses,
  readAddress,
  setUpDeploy,
} from "../deploy-utils";
import { getEnvContractName, getEnvNetwork } from "../get-env";
import { MovementPackageTxBuilder } from "../package";
import { LEDGER_ACCOUNT_ID, MULTI_SIG_ADDRESS } from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

async function proposeUpgrade(
  aptos: Aptos,
  sender: AccountAddress,
  signerAddress: AccountAddress = AccountAddress.from(MULTI_SIG_ADDRESS),
  networkName = getEnvNetwork(),
  contractName = getEnvContractName()
) {
  const contractAddress = readAddress(contractName, networkName);

  const { bytecode, metadataBytes } = await setUpDeploy(
    aptos,
    signerAddress,
    contractName,
    prepareDepAddresses(contractName),
    contractAddress
  );

  fs.writeFileSync(
    getTransactionJsonPath(),
    JSON.stringify({
      metadataBytes,
      bytecode,
    })
  );

  console.log(`Upgrading package as ${signerAddress.toString()}`);
  const upgradeTxPayload = await new MovementPackageTxBuilder(
    aptos
  ).objectUpgradeTxPayload(
    signerAddress,
    contractAddress,
    metadataBytes,
    bytecode
  );

  return await MultiSigTxBuilder.proposeTx(aptos, sender, upgradeTxPayload);
}

async function main() {
  const response = await executeAsLedger(async (aptos, signerAddress) => {
    return await proposeUpgrade(aptos, signerAddress);
  }, LEDGER_ACCOUNT_ID);

  console.log(
    `Transaction ${response.hash} created;\n` +
      `Visit the explorer, find the '0x1::multisig_account::CreateTransaction' event's 'sequence_number'\n` +
      `and set 'TX_ID' value in consts.ts file and in the\n${getTransactionJsonPath()} file.`
  );
}

void main();

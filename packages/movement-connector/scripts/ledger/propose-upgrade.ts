import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import fs from "fs";
import {
  getEnvContractName,
  getEnvNetwork,
  prepareDepAddresses,
  readAddress,
  setUpDeploy,
} from "../deploy-utils";
import { MovementPackageTxBuilder } from "../package";
import {
  LEDGER_ACCOUNT_ID,
  MULTI_SIG_ADDRESS,
  TRANSACTION_JSON_PATH,
} from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

async function proposeUpgrade(
  aptos: Aptos,
  sender: AccountAddress,
  contractName = getEnvContractName(),
  networkName = getEnvNetwork()
) {
  const multiSigAddress = AccountAddress.from(MULTI_SIG_ADDRESS);
  const contractAddress = readAddress(contractName, networkName);

  const { bytecode, metadataBytes } = await setUpDeploy(
    aptos,
    multiSigAddress,
    contractName,
    prepareDepAddresses(contractName),
    contractAddress
  );

  fs.writeFileSync(
    TRANSACTION_JSON_PATH,
    JSON.stringify({
      metadataBytes,
      bytecode,
    })
  );

  console.log("Upgrading package as multi-sig");
  const upgradeTxPayload = await new MovementPackageTxBuilder(
    aptos
  ).objectUpgradeTxPayload(
    multiSigAddress,
    contractAddress,
    metadataBytes,
    bytecode
  );

  return await MultiSigTxBuilder.proposeTx(aptos, sender, upgradeTxPayload);
}

async function main() {
  await executeAsLedger(proposeUpgrade, LEDGER_ACCOUNT_ID);
}

void main();

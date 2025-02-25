import {
  AccountAddress,
  Aptos,
  generateRawTransaction,
  HexInput,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import fs from "fs";
import { getEnvContractName, readAddress } from "../deploy-utils";
import { MovementPackageTxBuilder } from "../package";
import { MULTI_SIG_ADDRESS, TRANSACTION_JSON_PATH } from "./const";
import { executeAsLedger } from "./execute-as-ledger";

async function executeTransaction(
  aptos: Aptos,
  sender: AccountAddress,
  transactionJsonPath: string,
  contractName = getEnvContractName()
) {
  const multiSigAddress = AccountAddress.from(MULTI_SIG_ADDRESS);
  const contractAddress = readAddress(contractName);
  const { metadataBytes, bytecode } = JSON.parse(
    fs.readFileSync(transactionJsonPath, "utf8")
  ) as { bytecode: HexInput[]; metadataBytes: HexInput };

  const payload = await new MovementPackageTxBuilder(
    aptos
  ).objectUpgradeTxPayload(
    multiSigAddress,
    contractAddress,
    metadataBytes,
    bytecode
  );

  const rawTransaction = await generateRawTransaction({
    aptosConfig: aptos.transaction.build.config,
    sender,
    payload,
  });

  return new SimpleTransaction(rawTransaction);
}

async function main() {
  await executeAsLedger((aptos, signerAddress) =>
    executeTransaction(aptos, signerAddress, TRANSACTION_JSON_PATH)
  );
}

void main();

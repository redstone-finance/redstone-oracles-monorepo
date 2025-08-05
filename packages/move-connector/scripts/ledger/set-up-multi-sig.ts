import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { getCurrencySymbol, promptForConfirmation } from "../utils";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";
import {
  LEDGER_ACCOUNT_ID,
  SIGNER_ADDRESSES,
  SIGNER_COUNT_THRESHOLD_FACTOR,
} from "./const";
import { executeAsLedger } from "./execute-as-ledger";

async function setUpMultiSig(
  aptos: Aptos,
  creatorAddress: AccountAddress,
  signers: AccountAddress[]
) {
  const allSigners = new Set(signers.map((address) => address.toString()));
  allSigners.add(creatorAddress.toString());
  const threshold = Math.ceil(allSigners.size * SIGNER_COUNT_THRESHOLD_FACTOR);
  allSigners.delete(creatorAddress.toString());

  const approvers = Array.from(allSigners);
  console.log(
    `Setting up new multi-sig with threshold: [${threshold}] for:\n[${approvers.join("\n")}]\n` +
      `INCLUDING additionally the creatorAddress as an approver: ${creatorAddress.toString()}`
  );

  await promptForConfirmation();

  const builder = new MultiSigTxBuilder(
    aptos,
    creatorAddress,
    approvers.map((address) => AccountAddress.from(address)),
    threshold
  );
  const multiSigAddress = await builder.nextMultiSignatureAddress();
  console.log(
    `Multi-sig account address: ${multiSigAddress.toString()}\n` +
      `Set the value as MULTI_SIG_ADDRESS inside consts.ts file\n` +
      `and also fund that account with some ${getCurrencySymbol()} coins`
  );
  return await builder.createMultiSigTx();
}

async function main() {
  const signers = SIGNER_ADDRESSES.map((addr) => AccountAddress.from(addr));

  await executeAsLedger(
    (aptos, signerAddress) => setUpMultiSig(aptos, signerAddress, signers),
    LEDGER_ACCOUNT_ID
  );
}

void main();

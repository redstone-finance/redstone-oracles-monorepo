import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import {
  LEDGER_ACCOUNT_ID,
  MULTI_SIG_ADDRESS,
  MULTI_SIG_UPGRADE_TX_ID,
} from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

async function approveTransaction(
  aptos: Aptos,
  sender: AccountAddress,
  txId: number
) {
  const multiSigAddress = AccountAddress.from(MULTI_SIG_ADDRESS);

  return await MultiSigTxBuilder.acceptTx(aptos, sender, multiSigAddress, txId);
}

async function main() {
  await executeAsLedger(
    (aptos, signerAddress) =>
      approveTransaction(aptos, signerAddress, MULTI_SIG_UPGRADE_TX_ID),
    LEDGER_ACCOUNT_ID
  );
}

void main();

import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { MULTI_SIG_ADDRESS } from "./const";
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

const TX_ID = 1;

async function main() {
  await executeAsLedger((aptos, signerAddress) =>
    approveTransaction(aptos, signerAddress, TX_ID)
  );
}

void main();

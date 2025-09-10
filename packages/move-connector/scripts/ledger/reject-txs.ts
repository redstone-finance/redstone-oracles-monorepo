import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { LEDGER_ACCOUNT_ID, MULTI_SIG_ADDRESS, TRANSACTIONS_TO_REJECT } from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { makeAptosLedger } from "./ledger-utils";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

async function rejectTransaction(aptos: Aptos, sender: AccountAddress, txId: number) {
  const multiSigAddress = AccountAddress.from(MULTI_SIG_ADDRESS);

  return await MultiSigTxBuilder.rejectTx(aptos, sender, multiSigAddress, txId);
}

async function main(transactionsToReject: number[]) {
  const aptos = await makeAptosLedger();

  for (const idx of transactionsToReject) {
    await executeAsLedger(
      (aptos, signerAddress) => rejectTransaction(aptos, signerAddress, idx),
      LEDGER_ACCOUNT_ID,
      aptos
    );
  }
}

void main(TRANSACTIONS_TO_REJECT);

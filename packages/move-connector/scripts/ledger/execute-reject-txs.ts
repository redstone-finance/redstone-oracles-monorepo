import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { LEDGER_ACCOUNT_ID, MULTI_SIG_ADDRESS } from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

const REJECT_UP_TO = 10;

async function executeRejectTxs(aptos: Aptos, sender: AccountAddress, upTo: number) {
  const multiSigAddress = AccountAddress.from(MULTI_SIG_ADDRESS);

  return await MultiSigTxBuilder.executeRejectTxs(aptos, sender, multiSigAddress, upTo);
}

async function main() {
  await executeAsLedger(
    (aptos, signerAddress) => executeRejectTxs(aptos, signerAddress, REJECT_UP_TO),
    LEDGER_ACCOUNT_ID
  );
}

void main();

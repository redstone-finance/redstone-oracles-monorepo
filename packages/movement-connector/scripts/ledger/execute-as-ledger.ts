import { AccountAddress, Aptos, SimpleTransaction } from "@aptos-labs/ts-sdk";
import { handleTxAsLedger, makeAptos } from "../utils";
import { LEDGER_ACCOUNT_ID } from "./const";
import { getLedgerData, makeAptosLedger } from "./ledger-utils";

export async function executeAsLedger(
  txCreator: (
    aptos: Aptos,
    signerAddress: AccountAddress
  ) => Promise<SimpleTransaction>,
  accountId = LEDGER_ACCOUNT_ID
) {
  const aptosLedger = await makeAptosLedger();
  const aptos = makeAptos();
  const data = await getLedgerData(aptosLedger, accountId);
  await aptos.getAccountInfo({
    accountAddress: AccountAddress.from(data.address),
  });
  const tx = await txCreator(aptos, AccountAddress.from(data.address));

  return await handleTxAsLedger(aptos, aptosLedger, tx, accountId);
}

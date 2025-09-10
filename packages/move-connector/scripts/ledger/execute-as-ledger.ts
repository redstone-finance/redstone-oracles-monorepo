import { AccountAddress, Aptos, SimpleTransaction } from "@aptos-labs/ts-sdk";
import { handleTxAsLedger, makeAptos } from "../utils";
import { AptosLedger, getLedgerData, makeAptosLedger } from "./ledger-utils";

export async function executeAsLedger(
  txCreator: (aptos: Aptos, signerAddress: AccountAddress) => Promise<SimpleTransaction>,
  accountId: number,
  ledger?: AptosLedger
) {
  const aptosLedger = ledger ?? (await makeAptosLedger());
  const aptos = makeAptos();
  const data = await getLedgerData(aptosLedger, accountId);

  const tx = await txCreator(aptos, AccountAddress.from(data.address));

  return await handleTxAsLedger(aptos, aptosLedger, tx, accountId);
}

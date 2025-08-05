import "dotenv/config";
import { LEDGER_ACCOUNT_ID } from "./const";
import { getLedgerData, makeAptosLedger } from "./ledger-utils";

export const main = async (accountId = 0) => {
  const sui = await makeAptosLedger();
  const publicKey = await getLedgerData(sui, accountId);
  console.log(publicKey);
};

// // Connect the ledger
// // Run the Sui application on it or rerun it when the ledger has gone into sleep mode
// // WARN ON THE account ID (Default set to 0, as the first account)
main(LEDGER_ACCOUNT_ID).catch((err) => console.log(err));

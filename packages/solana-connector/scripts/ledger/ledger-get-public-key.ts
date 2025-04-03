import { LEDGER_ACCOUNT } from "./config";
import { makeSolana } from "./ledger-utils";

async function main() {
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);

  console.log(await solanaLedger.getPublicKey());
}

void main();

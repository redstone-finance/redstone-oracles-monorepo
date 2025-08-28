import { ACCOUNT_ID } from "./consts";
import { makeStellar } from "./ledger-utils";

async function main() {
  const stellar = await makeStellar(ACCOUNT_ID);

  console.log(await stellar.getPublicKey());
}

void main();

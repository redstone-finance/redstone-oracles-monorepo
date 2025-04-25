import "dotenv/config";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, makeSquads, PROGRAM_ID } from "./config";
import { makeSolana } from "./ledger-utils";
import { createSetUpgradeAuthorityTx } from "./transfer-ownership";

async function transferOwnershipFromLedger() {
  const connection = makeConnection();
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);
  const pk = await solanaLedger.getPublicKey();
  const squadsUtils = makeSquads();
  const vaultPda = squadsUtils.vaultPda();

  const tx = await createSetUpgradeAuthorityTx(
    connection,
    PROGRAM_ID,
    pk.ed,
    vaultPda,
    pk.ed
  );

  await solanaLedger.signTransaction(tx);

  console.log(
    `Setting program authority from ${pk.ed.toBase58()} to squads vault ${vaultPda.toBase58()}`
  );

  const signature = await connection.sendTransaction(tx);

  console.log(`Transaction signature: ${signature}`);
}

void transferOwnershipFromLedger();

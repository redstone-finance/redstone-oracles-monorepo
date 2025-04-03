import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { makeConnection, readKeypair } from "../utils";
import { makeSquads, PROGRAM_ID } from "./config";
import { createSetUpgradeAuthorityTx } from "./transfer-ownership";

async function setOwnership() {
  const url = RedstoneCommon.getFromEnv("URL");
  const connection = makeConnection(url);
  const authority = readKeypair();

  const squadsUtils = makeSquads();
  const vaultPda = squadsUtils.vaultPda();

  const tx = await createSetUpgradeAuthorityTx(
    connection,
    PROGRAM_ID,
    authority.publicKey,
    vaultPda,
    authority.publicKey
  );
  tx.sign([authority]);

  console.log(
    `Setting program authority from ${authority.publicKey.toBase58()} to squads vault ${vaultPda.toBase58()}`
  );

  const signature = await connection.sendTransaction(tx);

  console.log(`Transaction signature: ${signature}`);
}

void setOwnership();

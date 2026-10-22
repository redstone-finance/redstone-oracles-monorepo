import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, SQUAD_ADDRESS, THRESHOLD } from "./config";
import { makeSolana } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";

const OLD_MEMBERS = [new PublicKey("")];
const NEW_MEMBERS = [new PublicKey("")];
const NEW_THRESHOLD = THRESHOLD;

async function replaceMembers(
  squadAddress: PublicKey,
  oldMembers: PublicKey[],
  newMembers: PublicKey[],
  newThreshold: number
) {
  const connection = makeConnection();
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);
  const squadUtils = new SquadsMultisig(squadAddress, connection);
  const publicKey = (await solanaLedger.getPublicKey()).ed;

  const ix = await squadUtils.replaceMembers(publicKey, oldMembers, newMembers, newThreshold);

  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [ix],
    }).compileToV0Message()
  );

  await solanaLedger.signTransaction(tx);
  console.log(await connection.sendTransaction(tx));
}

void replaceMembers(SQUAD_ADDRESS, OLD_MEMBERS, NEW_MEMBERS, NEW_THRESHOLD);

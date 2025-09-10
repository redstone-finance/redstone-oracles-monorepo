import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, SQUAD_ADDRESS } from "./config";
import { makeSolana } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";

const OLD_MEMBERS = [new PublicKey("Fuq9VAhDahfaXodDne3zjmzYWZ7L92tmWSF7gPHVVXi1")];
const NEW_THRESHOLD = 2;

async function removeMember(squadAddress: PublicKey, members: PublicKey[], newThreshold: number) {
  const connection = makeConnection();
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);
  const squadUtils = new SquadsMultisig(squadAddress, connection);
  const publicKey = (await solanaLedger.getPublicKey()).ed;

  const ix = await squadUtils.removeMembers(publicKey, members, newThreshold);

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

void removeMember(SQUAD_ADDRESS, OLD_MEMBERS, NEW_THRESHOLD);

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { makeConnection, readKeypair } from "./utils";

import "dotenv/config";

async function transferSol() {
  const connection = makeConnection();
  const keypair = readKeypair();

  const args = process.argv.slice(2);
  const receiver = args[0];

  const ix = SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: new PublicKey(receiver),
    lamports: LAMPORTS_PER_SOL / 1_000,
  });

  const msg = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [ix],
  });

  const tx = new VersionedTransaction(msg.compileToV0Message());
  tx.sign([keypair]);

  console.log(await connection.sendTransaction(tx));
}

void transferSol();

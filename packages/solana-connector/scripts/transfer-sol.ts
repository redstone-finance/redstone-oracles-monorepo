import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { makeConnection, readKeypair } from "./utils";

import "dotenv/config";

async function transferSol(receiver: string, amount = 0.001) {
  const connection = makeConnection();
  const keypair = readKeypair();

  const ix = SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: new PublicKey(receiver),
    lamports: Math.floor(LAMPORTS_PER_SOL * amount),
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

async function main() {
  const args = process.argv.slice(2);
  const receiver = args[0];

  await transferSol(receiver, 2);
}

void main();

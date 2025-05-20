import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import "dotenv/config";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, SQUAD_ADDRESS } from "./config";
import { makeSolana } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";

const NEW_MEMBERS = [
  Keypair.generate().publicKey,
  Keypair.generate().publicKey,
];
const NEW_THRESHOLD = 2;

async function add_member(
  squadAddress: PublicKey,
  members: PublicKey[],
  newThreshold: number
) {
  const connection = makeConnection();
  const solanaLedger = await makeSolana(LEDGER_ACCOUNT);
  const squadUtils = new SquadsMultisig(squadAddress, connection);
  const publicKey = (await solanaLedger.getPublicKey()).ed;

  const ix = await squadUtils.addMembers(publicKey, members, newThreshold);

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

void add_member(SQUAD_ADDRESS, NEW_MEMBERS, NEW_THRESHOLD);

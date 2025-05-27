import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import "dotenv/config";
import { parseTransaction } from "../tx-checks/check-tx";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, SQUAD_ADDRESS } from "./config";
import { makeSolana } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";

const NEW_MEMBERS = [
  new PublicKey("E3XSRMLWqYaJf8L7WHfvTq5m1DoP7mD8k9zxb9TpZMmP"),
  new PublicKey("7sUFQsjXX28VttZaKsYfE2kpNjEguav649hbtcnPZZCJ"),
];
const NEW_THRESHOLD = 2;

async function addMember(
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

  await parseTransaction(tx, connection, squadUtils);
  await solanaLedger.signTransaction(tx);
  console.log(await connection.sendTransaction(tx));
}

void addMember(SQUAD_ADDRESS, NEW_MEMBERS, NEW_THRESHOLD);

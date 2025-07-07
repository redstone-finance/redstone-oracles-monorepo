import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import "dotenv/config";
import { BPF_UPGRADEABLE_LOADER } from "../consts";
import { makeConnection } from "../utils";
import { LEDGER_ACCOUNT, makeSquads } from "./config";
import { makeSolana } from "./ledger-utils";

function closeBufferAccountTx(
  payer: PublicKey,
  bufferAddress: PublicKey,
  recipient: PublicKey
) {
  const keys = [
    { pubkey: bufferAddress, isWritable: true, isSigner: false },
    { pubkey: recipient, isWritable: true, isSigner: false },
    { pubkey: payer, isWritable: false, isSigner: true },
  ];

  const data = Buffer.from([5, 0, 0, 0]);

  return new TransactionInstruction({
    keys,
    programId: BPF_UPGRADEABLE_LOADER,
    data,
  });
}

async function main(buffer: PublicKey, recipient: PublicKey) {
  const connection = makeConnection();
  const ledger = await makeSolana(LEDGER_ACCOUNT);
  const squad = makeSquads();

  const pk = (await ledger.getPublicKey()).ed;

  const ix = closeBufferAccountTx(squad.vaultPda(), buffer, recipient);
  const vix = await squad.createVaultTransaction(pk, ix, undefined);

  const message = new TransactionMessage({
    payerKey: pk,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [vix],
  });

  const tx = new VersionedTransaction(message.compileToV0Message());
  await ledger.signTransaction(tx);

  console.log(await connection.sendTransaction(tx));
}

void main(
  new PublicKey("AQB25cqtAG6uwg6KqEdtGoV4rfZbaN64xm37fWf1SCeH"),
  new PublicKey("jankv2HfKnTipHzVF82Hgvo8UzNVJwDKNV3mEgp9bBF")
);

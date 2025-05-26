import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { SolanaLedgerSigner } from "./ledger-utils";

export type Signer =
  | {
      type: "local";
      signer: Keypair;
    }
  | {
      type: "ledger";
      signer: SolanaLedgerSigner;
    };

export async function signerPublicKey(signer: Signer) {
  if (signer.type === "local") {
    return signer.signer.publicKey;
  }
  return (await signer.signer.getPublicKey()).ed;
}

export async function sign(signer: Signer, tx: VersionedTransaction) {
  if (signer.type === "local") {
    tx.sign([signer.signer]);
    return;
  }
  await signer.signer.signTransaction(tx);
}

import { StrKey } from "@stellar/stellar-sdk";
import "dotenv/config";
import { makeKeypair } from "../src";

const SHOW_PRIVATE_KEY: boolean = false;

function main() {
  if (SHOW_PRIVATE_KEY) {
    const keypair = makeKeypair();
    console.log(keypair.secret());
    console.log(keypair.publicKey());
  }

  console.log(
    `${StrKey.encodeEd25519PublicKey(Buffer.from("784248e01387ea5d00582a9664ca57ee6f9308ecd379365018ff3e4e32001bff", "hex"))}`
  );
}

void main();

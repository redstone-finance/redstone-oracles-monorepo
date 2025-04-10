import { PublicKey } from "@solana/web3.js";
import "dotenv/config";

function convertPublicKey(hexPublicKey: string) {
  const cleanHex = hexPublicKey.startsWith("0x")
    ? hexPublicKey.slice(2)
    : hexPublicKey;

  const keyBytes = new Uint8Array(
    cleanHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const publicKey = new PublicKey(keyBytes);
  console.log("Solana Address (Base58):", publicKey.toBase58());
}

function main() {
  convertPublicKey(
    "b4e73475beda3eca111c79ccc60c1a0d89f8196296b5496152681cbd14e7e43c"
  );
}

void main();

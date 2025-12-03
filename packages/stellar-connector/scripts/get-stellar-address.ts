import "dotenv/config";
import { makeKeypair } from "../src";

function main() {
  const keypair = makeKeypair();

  console.log(`Address: ${keypair.publicKey()}`);
}

void main();

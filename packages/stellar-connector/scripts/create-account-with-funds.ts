import { makeKeypair, StellarClientBuilder } from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { readNetwork, readUrl } from "./utils";

const ACCOUNT_TO_CREATE = "GDJRUXF7QNI4G3YQEBKYX26HTBKDKVLFQRVVXG7RPE5WDI57LPFZH5CF";
const INITIAL_XLM = 15;

async function main() {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const hash = await client.createAccountWithFunds(
    new StellarSigner(keypair),
    ACCOUNT_TO_CREATE,
    INITIAL_XLM
  );

  console.log(`Creation hash ${hash}`);
}

void main();

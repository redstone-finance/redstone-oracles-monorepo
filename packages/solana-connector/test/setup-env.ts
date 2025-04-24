import {} from "@redstone-finance/sdk";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { LiteSVM } from "litesvm";
import path from "node:path";
import {
  ConnectionStateScenario,
  LiteSVMConnection,
} from "./LiteSVMConnection";

function programPath() {
  return path.join(
    __dirname,
    "../solana/target/deploy/redstone_solana_price_adapter.so"
  );
}

function publicToDummyKeypair(publicKey: Uint8Array) {
  const secretKey = Buffer.from([...Array(32).keys(), ...publicKey]);
  return new Keypair({ publicKey, secretKey });
}

export function setUpEnv() {
  const svm = new LiteSVM().withBlockhashCheck(false).withSigverify(false);

  const programId = new PublicKey(
    "rds8J7VKqLQgzDr7vS59dkQga3B1BotgFy8F7LSLC74"
  );
  svm.addProgramFromFile(programId, programPath());

  const publicBytes = Buffer.from(
    "f7a8654c99499d762eccafd584e8b16ab5119c162611f7c99f70d2d781fb3931",
    "hex"
  );

  const trustedSigner = publicToDummyKeypair(publicBytes);
  const untrustedSigner = Keypair.generate();

  svm.airdrop(trustedSigner.publicKey, BigInt(LAMPORTS_PER_SOL));
  svm.airdrop(untrustedSigner.publicKey, BigInt(LAMPORTS_PER_SOL));

  const state = new ConnectionStateScenario(svm);
  const connection = new LiteSVMConnection(state);

  return {
    svm,
    programId,
    trustedSigner,
    untrustedSigner,
    connection,
    state,
  };
}

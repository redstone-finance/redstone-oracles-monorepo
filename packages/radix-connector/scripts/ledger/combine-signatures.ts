import {
  Intent,
  Signature,
  SignatureSource,
  SignatureWithPublicKey,
  TransactionBuilder,
} from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { arrayify } from "ethers/lib/utils";
import { z } from "zod";
import { makeRadixClient } from "../constants";
import { COMPILED_TRANSACTION, RAW_SIGNATURES } from "./config";
import { decompileIntent } from "./decompile-into-intent";

export type RawSignature = {
  publicKey: string;
  signature: string;
};

async function getNotarizedTransaction(
  notarySigner: SignatureSource<Signature>,
  intent: Intent,
  signatures: RawSignature[]
) {
  const builder = await TransactionBuilder.new();
  let tx = builder.header(intent.header).manifest(intent.manifest);

  for (const signature of signatures) {
    const signatureWithPublicKey = new SignatureWithPublicKey.Ed25519(
      arrayify(signature.signature),
      arrayify(signature.publicKey)
    );
    tx = tx.sign(signatureWithPublicKey);
  }

  return await tx.notarize(notarySigner);
}

async function main(compiledIntent: string, signatures: RawSignature[]) {
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const client = makeRadixClient(networkId);

  const intent = await decompileIntent(compiledIntent);
  const notarizedTransaction = await getNotarizedTransaction(
    client.getNotarySigner()!,
    intent,
    signatures
  );

  await client.submitTransaction(notarizedTransaction);
}

void main(COMPILED_TRANSACTION, RAW_SIGNATURES);

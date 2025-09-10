import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { z } from "zod";
import { COMPILED_TRANSACTION } from "./config";
import { decompileIntent } from "./decompile-into-intent";
import { LedgerSigner } from "./ledger-utils";

async function signIntent(compiledIntent: string) {
  const accountId = RedstoneCommon.getFromEnv("ACCOUNT_ID", z.number());
  const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", z.number());
  const intent = await decompileIntent(compiledIntent);
  const ledgerSigner = await LedgerSigner.makeLedgerSigner(accountId, networkId);
  const hashToSign = (await RadixEngineToolkit.Intent.intentHash(intent)).hash;

  console.log(`Intent hash to sign: ${hexlify(hashToSign)}`);

  const signature = await ledgerSigner.signIntentToSignatureWithKey(hashToSign);
  console.log({
    signature: hexlify(signature.signature),
    publicKey: hexlify(signature.publicKey),
  });
}

async function main(compiledIntent: string) {
  await signIntent(compiledIntent);
}

void main(COMPILED_TRANSACTION);

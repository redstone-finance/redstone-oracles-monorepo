import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { z } from "zod";

const STELLAR_SECRET_KEY_PREFIX = "S";

export function makeKeypair(privateKey = readPrivateKey()) {
  try {
    if (privateKey.startsWith(STELLAR_SECRET_KEY_PREFIX)) {
      return Keypair.fromSecret(privateKey);
    }

    return Keypair.fromRawEd25519Seed(
      Buffer.from(
        privateKey.startsWith("0x") ? privateKey.substring(2) : privateKey,
        "hex"
      )
    );
  } catch (e) {
    throw new Error(
      `Wrong secret key format: ${RedstoneCommon.stringifyError(e)}`
    );
  }
}

function readPrivateKey() {
  return RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
}

import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { z } from "zod";

export function makeKeypair(privateKey = readPrivateKey()) {
  try {
    return Keypair.fromSecret(privateKey);
  } catch (e) {
    throw new Error(
      `Wrong secret key format: ${RedstoneCommon.stringifyError(e)});`
    );
  }
}

function readPrivateKey() {
  return RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
}

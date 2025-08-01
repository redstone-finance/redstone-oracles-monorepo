import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { z } from "zod";

export function makeKeypair(privateKey = readPrivateKey()) {
  return Keypair.fromSecret(privateKey);
}

function readPrivateKey() {
  return RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
}

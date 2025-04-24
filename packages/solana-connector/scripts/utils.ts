import { RedstoneCommon } from "@redstone-finance/utils";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { makeKeypair } from "../src";

export const CONTRACT_NAME = "redstone_solana_price_adapter";

export function readKeypair() {
  const privateKey = RedstoneCommon.getFromEnv(
    "PRIVATE_KEY",
    z.array(z.number().gte(0).lte(255)).or(z.string())
  );
  return makeKeypair(privateKey);
}

export function readUrl() {
  return RedstoneCommon.getFromEnv("URL", z.string().url());
}

export function readDeployDir() {
  return RedstoneCommon.getFromEnv("DEPLOY_DIR", z.string().default("solana"));
}

export function makeConnection(apiUrl = readUrl()) {
  return new Connection(apiUrl, "confirmed");
}

export function balanceFromSol(balance: number) {
  return balance * LAMPORTS_PER_SOL;
}

export function balanceToSol(balance: number) {
  return balance / LAMPORTS_PER_SOL;
}

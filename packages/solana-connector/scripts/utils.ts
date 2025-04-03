import { RedstoneCommon } from "@redstone-finance/utils";
import { Cluster, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { readFileSync } from "fs";
import path from "node:path";
import { z } from "zod";
import { makeKeypair } from "../src/utils";

export const PRICE_ADAPTER_NAME = "price_adapter";

export function readKeypair() {
  const privateKey = RedstoneCommon.getFromEnv(
    "PRIVATE_KEY",
    z.array(z.number().gte(0).lte(255))
  );
  return makeKeypair(privateKey);
}

export function readCluster() {
  return RedstoneCommon.getFromEnv(
    "CLUSTER",
    z.enum(["devnet", "testnet", "mainnet-beta"])
  );
}

export function makeConnection(apiUrl: string) {
  return new Connection(apiUrl, "confirmed");
}

export function readIdl(cluster?: Cluster) {
  const value = readFileSync(
    path.join(
      __dirname,
      "..",
      "deployed",
      cluster ?? readCluster(),
      `${PRICE_ADAPTER_NAME}.json`
    ),
    "utf8"
  );

  return JSON.parse(value) as unknown;
}

export function balanceFromSol(balance: number) {
  return balance * LAMPORTS_PER_SOL;
}

export function balanceToSol(balance: number) {
  return balance / LAMPORTS_PER_SOL;
}

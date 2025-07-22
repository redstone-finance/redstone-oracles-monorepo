import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";

const OUTPUT_DIR = "./stellar/";

export function readUrl() {
  return RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
}

export function readPrivateKey() {
  return RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
}

export function readNetwork() {
  return RedstoneCommon.getFromEnv(
    "NETWORK",
    z.enum(["testnet", "mainnet", "custom"])
  );
}

export function makeServer() {
  const server = new rpc.Server(readUrl());

  return server;
}

export function makeKeypair() {
  const privateKey = readPrivateKey();

  return Keypair.fromSecret(privateKey);
}

export function saveAdapterId(adapterId: string, dir = OUTPUT_DIR) {
  const network = readNetwork();
  const filepath = path.join(dir, `adapter-id.${network}`);

  writeFileSync(filepath, adapterId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadAdapterId(dir = OUTPUT_DIR) {
  const network = readNetwork();
  const filepath = path.join(dir, `adapter-id.${network}`);

  return readFileSync(filepath).toString("utf-8");
}

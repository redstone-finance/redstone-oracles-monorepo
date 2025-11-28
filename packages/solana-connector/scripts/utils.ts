import { RedstoneCommon } from "@redstone-finance/utils";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { arrayify } from "ethers/lib/utils";
import { z } from "zod";
import { makeKeypair } from "../src";

export const CONTRACT_NAME = "redstone_solana_price_adapter";

export function readKeypairBytes() {
  const keypair = RedstoneCommon.getFromEnv(
    "PRIVATE_KEY",
    z.array(z.number().gte(0).lte(255)).or(z.string())
  );
  return arrayify(keypair, { allowMissingPrefix: true });
}

export function readKeypair() {
  return makeKeypair(readKeypairBytes());
}

export function readUrl() {
  return RedstoneCommon.getFromEnv("URL", z.url());
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

export function getSolanaVerifyBaseParams(deployDir: string, address: string) {
  return (
    `https://github.com/redstone-finance/redstone-oracles-monorepo ` +
    `--mount-path packages/solana-connector/${deployDir} ` +
    `--library-name ${CONTRACT_NAME} ` +
    `-u  ${readUrl()} ` +
    `--program-id ${address} `
  );
}

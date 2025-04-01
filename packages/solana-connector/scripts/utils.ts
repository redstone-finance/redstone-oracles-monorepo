import { RedstoneCommon } from "@redstone-finance/utils";
import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import path from "node:path";
import { z } from "zod";

export const PRICE_ADAPTER_NAME = "price_adapter";

const BYTE_LENGTHS = {
  PRIVATE_KEY: 32,
  SECRET_KEY: 64,
};

export function readKeyPair() {
  const privateKey = RedstoneCommon.getFromEnv(
    "PRIVATE_KEY",
    z.array(z.number().gte(0).lte(255))
  );

  const privateKeyBuffer = Buffer.from(privateKey);

  const isValidLength =
    privateKeyBuffer.length === BYTE_LENGTHS.PRIVATE_KEY ||
    privateKeyBuffer.length === BYTE_LENGTHS.SECRET_KEY;

  if (!isValidLength) {
    throw new Error(
      `Invalid private key length: ${privateKeyBuffer.length} bytes. Expected ${BYTE_LENGTHS.PRIVATE_KEY} or ${BYTE_LENGTHS.SECRET_KEY} bytes.`
    );
  }

  if (privateKeyBuffer.length === BYTE_LENGTHS.PRIVATE_KEY) {
    // Using pure private key to derive full keypair
    return Keypair.fromSeed(privateKeyBuffer);
  } else {
    // Using full secret key (which contains both private and public keys)
    return Keypair.fromSecretKey(privateKeyBuffer);
  }
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

export function connectToCluster(cluster?: Cluster) {
  return new Connection(clusterApiUrl(cluster ?? readCluster()), "confirmed");
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

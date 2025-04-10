import { RedstoneCommon } from "@redstone-finance/utils";
import { Cluster, clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { arrayify } from "ethers/lib/utils";
import { z } from "zod";

export function hexToU8Array(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export const makeFeedIdBytes = (feedId: string) => {
  return Buffer.from(feedId.padEnd(32, "\0"));
};

export const makePriceSeed = () => {
  return Buffer.from("price".padEnd(32, "\0"));
};

const BYTE_LENGTHS = {
  PRIVATE_KEY: 32,
  SECRET_KEY: 64,
};

export function makeKeypair(privateKeyInput: number[] | string) {
  const privateKey = arrayify(privateKeyInput, { allowMissingPrefix: true });
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

export function connectToCluster(cluster?: Cluster) {
  return new Connection(clusterApiUrl(cluster ?? readCluster()), "confirmed");
}

export function readCluster() {
  return RedstoneCommon.getFromEnv(
    "CLUSTER",
    z.enum(["devnet", "testnet", "mainnet-beta"])
  );
}

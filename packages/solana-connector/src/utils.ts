import { Cluster, clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { arrayify } from "ethers/lib/utils";
import { readCluster } from "../scripts/utils";

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

export function makeMockKeypair() {
  const mockSeed: number[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
  ];

  return makeKeypair(mockSeed);
}

export function makeKeypair(privateKeyInput: number[] | string) {
  let privateKey: ArrayLike<number>;

  if (typeof privateKeyInput === "string") {
    privateKey = arrayify(privateKeyInput);
  } else {
    privateKey = privateKeyInput;
  }

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

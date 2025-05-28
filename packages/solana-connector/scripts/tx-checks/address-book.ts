import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import {
  Cluster,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import "dotenv/config";
import { DEVNET_BOOK } from "./devnet-book";
import { MAINNET_BOOK } from "./mainnet-book";

export const SYSTEM_ACCOUNTS = {
  clock: SYSVAR_CLOCK_PUBKEY,
  system: SYSTEM_PROGRAM_ID,
  bpfLoaderUpgradeable: new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  ),
  rent: SYSVAR_RENT_PUBKEY,
};

export const KNOWN_PROGRAMS = {
  squadAddress: new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"),
  otterVerify: new PublicKey("verifycLy8mB96wd9wqq3WDXQwM4oU6r42Th37Db9fC"),
};

export function reverseBook(book: Record<string, string>) {
  const reversed: Record<string, string> = {};
  for (const [key, value] of Object.entries(book)) {
    reversed[value] = key;
  }
  return reversed;
}

export function addressNameMap(cluster: Cluster) {
  let book: Record<string, unknown>;

  switch (cluster) {
    case "devnet":
      book = { ...DEVNET_BOOK, ...SYSTEM_ACCOUNTS, ...KNOWN_PROGRAMS };
      break;
    case "mainnet-beta":
      book = { ...MAINNET_BOOK, ...SYSTEM_ACCOUNTS, ...KNOWN_PROGRAMS };
      break;
    case "testnet":
      throw new Error("testnet unsupported");
  }

  const map: Record<string, string> = {};

  for (const [name, value] of Object.entries(book)) {
    if (value instanceof PublicKey) {
      map[value.toBase58()] = name;
    } else if (Array.isArray(value)) {
      for (const [i, pk] of value.entries()) {
        if (pk instanceof PublicKey) {
          map[pk.toBase58()] = `${name}[${i}]`;
        }
      }
    }
  }

  return map;
}

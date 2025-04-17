import { PublicKey } from "@solana/web3.js";
import { makeConnection } from "../utils";
import { SquadsMultisig } from "./multi-sig-utils";

export const LEDGER_ACCOUNT = 3;
export const THRESHOLD = 2;
export const MULTI_SIG_PUBLIC_KEYS = [
  "b3cf8140d542beba4ac7b492afbc427a5441e643ff6631c9423ba7892dc2cf96",
  "c31f0e40ec3c164388a270bf0790f8d3da165d53436019663c8d643051edaab2",
  "dd8c421c0c5753deea9865e51d6c1c52e9fe28265cc2a06bc841b3a6c48058a2",
];

export const SQUAD_ADDRESS = new PublicKey(
  "5khdVsyvPCDfbz1id1VBFVKHABKQWKrhPYEo4sZGnyfh"
);

export const PROGRAM_ID = new PublicKey(
  "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr"
);

export const TEMP_AUTHORITY = new PublicKey(
  "Co5UYi6GPzN1a7j9jKohzcSjhmGyq53k5bsJzEtkQqee"
);

export function makeSquads() {
  const connection = makeConnection();

  return new SquadsMultisig(SQUAD_ADDRESS, connection);
}

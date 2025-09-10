import { PublicKey } from "@solana/web3.js";
import { makeConnection } from "../utils";
import { SquadsMultisig } from "./multi-sig-utils";

export const LEDGER_ACCOUNT = 3;
export const THRESHOLD = 3;
export const MULTI_SIG_PUBLIC_KEYS = [
  "b3cf8140d542beba4ac7b492afbc427a5441e643ff6631c9423ba7892dc2cf96",
  "c31f0e40ec3c164388a270bf0790f8d3da165d53436019663c8d643051edaab2",
  "97b6920a47beae087f4f1e7470ec14ac134a373a47bb2dfecfa1aac3efebe105",
  "c1cd8221a4166dc33b845563a4ada000860379d36b3f72e6635017fd0bfcee0e",
  "6613f8d286f38da095d7b4e7fd932aee14f5649feed780c28f043ab8bf4324cf",
];

export const SQUAD_ADDRESS = new PublicKey("5khdVsyvPCDfbz1id1VBFVKHABKQWKrhPYEo4sZGnyfh");

export const PROGRAM_ID = new PublicKey("REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr");

export const TEMP_AUTHORITY = new PublicKey("Co5UYi6GPzN1a7j9jKohzcSjhmGyq53k5bsJzEtkQqee");

export function makeSquads() {
  const connection = makeConnection();

  return new SquadsMultisig(SQUAD_ADDRESS, connection);
}

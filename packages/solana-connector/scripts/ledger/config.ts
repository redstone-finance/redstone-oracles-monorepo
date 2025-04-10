import { PublicKey } from "@solana/web3.js";
import { RDS_PROGRAM_ADDRESS } from "../consts";
import { makeConnection } from "../utils";
import { SquadsMultisig } from "./multi-sig-utils";

export const LEDGER_ACCOUNT = 3;
export const THRESHOLD = 2;
export const MULTI_SIG_PUBLIC_KEYS = [
  "879ecebdbf87aa1c34a4f798f1c1a3b7dd33cd2303d40475418f14e70600fe49",
  "d4569413c8a7352735410efe7cfcdc9f952b498bf4aa5237c5014e2f80f3f49c",
];

export const SQUAD_ADDRESS = new PublicKey(
  "9iJemhhVyJJtGVCSvhpgczVF47ALwDuP85asyjFVeqyv"
);

export const PROGRAM_ID = new PublicKey(RDS_PROGRAM_ADDRESS);

export const TEMP_AUTHORITY = new PublicKey(
  "6kNKna8xNBU5rxWWBn6jNLkTzBn7sfeHaH3HsjxTZyqp"
);

export function makeSquads() {
  const connection = makeConnection();

  return new SquadsMultisig(SQUAD_ADDRESS, connection);
}

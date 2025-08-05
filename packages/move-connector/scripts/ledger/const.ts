import { isAptos } from "../config";
import { getEnvNetwork } from "../get-env";

// todo: decide on ids per network
const MOVEMENT_LEDGER_ACCOUNT_ID = 0;
const APTOS_LEDGER_ACCOUNT_ID = 1;

export const LEDGER_ACCOUNT_ID = isAptos(getEnvNetwork())
  ? APTOS_LEDGER_ACCOUNT_ID
  : MOVEMENT_LEDGER_ACCOUNT_ID;

// Addresses here, not public keys - use `yarn ledger-utils` to derive the current one
const APTOS_SIGNER_ADDRESSES = [
  "0xa2145a4166168745cab9abb5201584d5650f8c462c7495c5b84b2127780e91fb",
  "0x58f1da6ee93f36a39fa33b6949d7a13850fc0855fb3f856247d630c790323d89",
];
const MOVEMENT_SIGNER_ADDRESSES = [""];

export const SIGNER_ADDRESSES = isAptos(getEnvNetwork())
  ? APTOS_SIGNER_ADDRESSES
  : MOVEMENT_SIGNER_ADDRESSES;

export const SIGNER_COUNT_THRESHOLD_FACTOR = 2 / 3;

const APTOS_MULTI_SIG_ADDRESS =
  "0xb4162d78f848e3849bcb17ca95c3e3126486b19f9146c452a6c8b3fc2e549da3";
const MOVEMENT_MULTI_SIG_ADDRESS =
  "0xd8a7ccae3ac968e19c7c9668149daa6e7e84b82a6438d34a3944a5a5568fef4d";

export const MULTI_SIG_ADDRESS = isAptos(getEnvNetwork())
  ? APTOS_MULTI_SIG_ADDRESS
  : MOVEMENT_MULTI_SIG_ADDRESS;

export const MULTI_SIG_UPGRADE_TX_ID = 1;

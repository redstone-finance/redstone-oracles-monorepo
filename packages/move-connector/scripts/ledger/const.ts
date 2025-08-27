import { isAptos } from "../config";
import { getEnvNetwork } from "../get-env";

const MOVEMENT_LEDGER_ACCOUNT_ID = 0;
const APTOS_LEDGER_ACCOUNT_ID = 5;

export const LEDGER_ACCOUNT_ID = isAptos(getEnvNetwork())
  ? APTOS_LEDGER_ACCOUNT_ID
  : MOVEMENT_LEDGER_ACCOUNT_ID;

// Addresses here, not public keys - use `yarn ledger-utils` to derive the current one
const APTOS_SIGNER_ADDRESSES = [
  "0xe75cdf97fbd8de1db48243a640100cc3b7881a5fdc5f44ea8d5de658d8c1f707",
  "0x1b3fee6723b8c46b1925624dec36481759836058ba1892fcf9aa6f81c7ae47bf",
  "0xe8eb3e6f7ed118dffb0e3329979f2f6ab12563d7fa99fe986dd4984bad9e53ea",
];
const MOVEMENT_SIGNER_ADDRESSES = [""];

export const SIGNER_ADDRESSES = isAptos(getEnvNetwork())
  ? APTOS_SIGNER_ADDRESSES
  : MOVEMENT_SIGNER_ADDRESSES;

export const SIGNER_COUNT_THRESHOLD_FACTOR = 2 / 3;

const APTOS_MULTI_SIG_ADDRESS =
  "0x47d1cc37bdfef12a5e7dcb854b00b34cf42bad7931d6ca6f7d7d0f078f4b9617";
const MOVEMENT_MULTI_SIG_ADDRESS =
  "0xd8a7ccae3ac968e19c7c9668149daa6e7e84b82a6438d34a3944a5a5568fef4d";

export const MULTI_SIG_ADDRESS = isAptos(getEnvNetwork())
  ? APTOS_MULTI_SIG_ADDRESS
  : MOVEMENT_MULTI_SIG_ADDRESS;

export const MULTI_SIG_TX_ID = 11;
export const TRANSACTIONS_TO_REJECT = [10];

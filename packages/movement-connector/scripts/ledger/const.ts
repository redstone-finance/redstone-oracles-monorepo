import path from "path";

export const LEDGER_ACCOUNT_ID = 0;
// Addresses here, not public keys - use `yarn ledger-utils` to derive the current one

export const SIGNER_ADDRESSES = [
  "0xa44f1ea68dee473674f0cd05e4bf4092b2fa4d693c2cd5e2075deb238bbae02c", // Lukasz's nano s plus
  "0x97dc63580bdc2f9e13fac80d137d2d0933178e6e69822f8ddca98311bd02ee1b", // Lukasz's ledger
];
export const SIGNER_COUNT_THRESHOLD_FACTOR = 2 / 3;

export const MULTI_SIG_ADDRESS =
  "0x2d3e67253deebe8c13f583be2363b88a6fdf579882ceb144e04ff3c33ae76b76";

export const TRANSACTION_JSON_PATH = path.join(
  __dirname,
  "..",
  "transaction.json"
);

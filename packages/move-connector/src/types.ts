import { Account, Aptos } from "@aptos-labs/ts-sdk";

export interface PriceDataSchema {
  feed_id: string;
  value: string;
  timestamp: string;
  write_timestamp: string;
}

export interface AptosVariables {
  client: Aptos;
  account: Account;
  packageObjectAddress: string;
}

/**
 * Provides the Movement chain transaction configuration.
 */
export interface TransactionConfig {
  writePriceOctasTxGasBudget: number;
  maxTxSendAttempts: number;
}

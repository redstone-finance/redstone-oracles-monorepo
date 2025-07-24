import { Account, Aptos } from "@aptos-labs/ts-sdk";

/**
 * Describes movement local config kept in ./movement/config.yaml file.
 */
export interface MovementLocalConfigSchema {
  profiles: LocalProfilesSchema;
}

export interface LocalProfilesSchema {
  default: LocalProfileSchema;
}

export interface LocalProfileSchema {
  network: string;
  private_key: string;
  public_key: string;
  account: string;
  rest_url: string;
}

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

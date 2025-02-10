import {
  Account,
  AccountAddress,
  Aptos,
  MoveVector,
  U8,
} from "@aptos-labs/ts-sdk";
import { ContractData } from "@redstone-finance/sdk";

/**
 * Expects from entity to write prices on chain.
 */
export interface IMovementWriteContractAdapter {
  /**
   * Writes prices to the price adapter object.
   *
   * @returns submitted transaction hash.
   *
   */
  writePrices(
    feedIds: MoveVector<MoveVector<U8>>,
    payload: MoveVector<U8>
  ): Promise<string>;
}

/**
 * Expects from entity to view specific parameters on the chain.
 */
export interface IMovementViewContractAdapter {
  /**
   * Allows to view the signer threshold set for the price adapter object.
   *
   * @returns submitted transaction hash.
   *
   */
  viewUniqueSignerThreshold(): Promise<number>;
  /**
   * Allows to view the contract data for the given feed ids of for the price adapter object.
   *
   * @returns submitted transaction hash.
   *
   */
  viewContractData(feedIds: string[]): Promise<ContractData>;
}

/**
 * Expects from entity to write, view and verify transactions to the chain.
 */
export interface IMovementContractAdapter {
  writer: IMovementWriteContractAdapter;
  viewer: IMovementViewContractAdapter;
}

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
  packageObjectAddress: AccountAddress;
}

import type { ClientWithCoreApi, SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import {
  PaginatedTransactionResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";

export const OBJECT_INCLUDE = { json: true, content: true } as const;

export interface SuiClient {
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<bigint>;
  getReferenceGasPrice(): Promise<bigint>;
  waitForTransaction(txId: string): Promise<boolean>;
  signAndExecute(
    tx: Transaction,
    keypair: Keypair
  ): Promise<SuiClientTypes.TransactionResult<{ effects: true; events: true }>>;

  listCoins(params: { owner: string; coinType: string; cursor?: string | null }): Promise<{
    objects: SuiClientTypes.Coin[];
    cursor?: string | null;
  }>;

  getObjects(objectIds: string[]): Promise<SuiClientTypes.Object<typeof OBJECT_INCLUDE>[]>;
  getObject(objectId: string): Promise<SuiClientTypes.Object<typeof OBJECT_INCLUDE>>;

  listDynamicFields(params: {
    parentId: string;
    limit?: number;
    cursor?: string;
  }): Promise<SuiClientTypes.ListDynamicFieldsResponse>;

  getDynamicFieldValue(
    parentId: string,
    name: SuiClientTypes.DynamicFieldName
  ): Promise<SuiClientTypes.GetDynamicFieldResponse>;

  getReceivedCoinObjectIds(params: {
    address: string;
    coinType?: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    objectIds: string[];
    cursor?: string | null;
  }>;

  clientForParallelExecutor(): ClientWithCoreApi;
  getChainIdentifier(): Promise<string>;

  getTimeForBlock(block: number): Promise<Date>;
  queryTransactionBlocks(
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ): Promise<PaginatedTransactionResponse>;
}

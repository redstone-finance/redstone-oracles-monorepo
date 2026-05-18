import type { ClientWithCoreApi, CoreClient, SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import {
  PaginatedTransactionResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";
import { MultiExecutor } from "@redstone-finance/utils";

export const OBJECT_INCLUDE = { json: true, content: true } as const;

const CORE_SUB_INSTANCE_MODES = {
  getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
  waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
  getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
  getObject: MultiExecutor.ExecutionMode.AGREEMENT,
  getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
  listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
  listDynamicFields: MultiExecutor.ExecutionMode.AGREEMENT,
  getChainIdentifier: MultiExecutor.ExecutionMode.AGREEMENT,
  signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
};

const COMMON_OUTER_MODES = {
  signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
  getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
  getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
  waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
};

export const SUB_INSTANCE_MODES = {
  core: CORE_SUB_INSTANCE_MODES,
  ...COMMON_OUTER_MODES,
};

export abstract class SuiClient {
  abstract get core(): CoreClient;
  abstract get clientWithCoreApi(): ClientWithCoreApi;

  abstract getBlockNumber(): Promise<number>;
  abstract getReferenceGasPrice(): Promise<bigint>;
  abstract getTimeForBlock(block: number): Promise<Date>;

  abstract getReceivedCoinObjectIds(params: {
    address: string;
    coinType?: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    objectIds: string[];
    cursor: string | null;
  }>;

  readonly queryTransactionBlocks?: (
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ) => Promise<PaginatedTransactionResponse>;

  async getChainIdentifier() {
    return (await this.core.getChainIdentifier()).chainIdentifier;
  }

  async getBalance(address: string) {
    const {
      balance: { balance },
    } = await this.core.getBalance({ owner: address });

    return BigInt(balance);
  }

  async waitForTransaction(txId: string) {
    const response = await this.core.waitForTransaction({ digest: txId });

    return response.$kind === "Transaction";
  }

  async signAndExecute(tx: Transaction, keypair: Keypair) {
    return await this.core.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      include: { effects: true, events: true },
    });
  }

  async listCoins({
    owner,
    cursor,
    coinType,
  }: {
    owner: string;
    coinType: string;
    cursor?: string | null;
  }) {
    const {
      objects,
      cursor: nextCursor,
      hasNextPage,
    } = await this.core.listCoins({
      owner,
      cursor: cursor ?? undefined,
      coinType,
    });

    return { objects, cursor: hasNextPage ? nextCursor : null };
  }

  async getObjects(objectIds: string[]) {
    const { objects } = await this.core.getObjects({
      objectIds,
      include: OBJECT_INCLUDE,
    });

    return objects.map((obj) => {
      if (obj instanceof Error) {
        throw obj;
      }

      return obj;
    });
  }

  async getObject(objectId: string) {
    const [obj] = await this.getObjects([objectId]);

    return obj;
  }

  async listDynamicFields(params: { parentId: string; limit?: number; cursor?: string }) {
    return await this.core.listDynamicFields(params);
  }

  async getDynamicFieldValue(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    return await this.core.getDynamicField({ parentId, name });
  }
}

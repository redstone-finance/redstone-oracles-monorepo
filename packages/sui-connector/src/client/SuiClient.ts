import type { ClientWithCoreApi, CoreClient, SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import type { Transaction } from "@mysten/sui/transactions";
import { MultiExecutor } from "@redstone-finance/utils";
import { SuiObjectsClient } from "./SuiObjectsClient";
import { SuiTxLookup } from "./lookup/SuiTxLookup";

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
  readonly objects: SuiObjectsClient;

  constructor(readonly core: CoreClient) {
    this.objects = new SuiObjectsClient(core);
  }

  abstract get clientWithCoreApi(): ClientWithCoreApi;
  abstract get txLookup(): SuiTxLookup;

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
    cursor?: string;
  }>;

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

  getObjects(objectIds: string[], include?: SuiClientTypes.ObjectInclude) {
    return this.objects.getObjects(objectIds, include);
  }

  getObject(objectId: string, include?: SuiClientTypes.ObjectInclude) {
    return this.objects.getObject(objectId, include);
  }

  async listDynamicFields(params: { parentId: string; limit?: number; cursor?: string }) {
    return await this.core.listDynamicFields(params);
  }

  getDynamicFieldValue(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    return this.objects.getDynamicFieldValue(parentId, name);
  }

  disposeCollectors() {
    this.objects.dispose();
  }
}

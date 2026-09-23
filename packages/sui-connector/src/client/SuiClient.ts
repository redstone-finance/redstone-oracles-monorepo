import { TypeTagSerializer } from "@mysten/sui/bcs";
import type { ClientWithCoreApi, CoreClient, SuiClientTypes } from "@mysten/sui/client";
import type { Keypair } from "@mysten/sui/cryptography";
import type { Transaction } from "@mysten/sui/transactions";
import { deriveDynamicFieldID } from "@mysten/sui/utils";
import type { TxLookup } from "@redstone-finance/multichain-kit";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiBlockNumberProvider } from "./SuiBlockNumberProvider";
import { SuiObjectsClient } from "./SuiObjectsClient";

const REFERENCE_GAS_PRICE_TTL_MS = 60_000;
const CORE_SUB_INSTANCE_MODES = {
  getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
  waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
  getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
  getObject: MultiExecutor.ExecutionMode.AGREEMENT,
  getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
  listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
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
  private readonly blockNumberProvider = new SuiBlockNumberProvider(this);

  private readonly getReferenceGasPriceMemoized = RedstoneCommon.memoize({
    functionToMemoize: () => this.fetchReferenceGasPrice(),
    ttl: REFERENCE_GAS_PRICE_TTL_MS,
  });

  constructor(readonly core: CoreClient) {
    this.objects = new SuiObjectsClient(core);
  }

  abstract get clientWithCoreApi(): ClientWithCoreApi;
  abstract get txLookup(): TxLookup;

  abstract getBlockNumber(): Promise<number>;
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

  protected abstract fetchReferenceGasPrice(): Promise<bigint>;

  async getReferenceGasPrice() {
    return await this.getReferenceGasPriceMemoized();
  }

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

  async getObject(objectId: string, blockNumber?: number, include?: SuiClientTypes.ObjectInclude) {
    await this.waitForBlockNumber(blockNumber);

    return await this.objects.getObject(objectId, include);
  }

  private async waitForBlockNumber(blockNumber?: number) {
    await this.blockNumberProvider.waitForBlockNumber(blockNumber);
  }

  async getDynamicFieldValues(
    parentId: string,
    names: SuiClientTypes.DynamicFieldName[],
    blockNumber?: number
  ) {
    await this.waitForBlockNumber(blockNumber);

    return await Promise.all(names.map((name) => this.getDynamicFieldValue(parentId, name)));
  }

  private async getDynamicFieldValue(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    try {
      const { dynamicField } = await this.objects.getDynamicFieldValue(parentId, name);

      return dynamicField.value.bcs;
    } catch (error) {
      if (this.isMissingFieldError(error, parentId, name)) {
        return undefined;
      }

      throw error;
    }
  }

  disposeCollectors() {
    this.objects.dispose();
  }

  protected abstract isMissingFieldError(
    error: unknown,
    parentId: string,
    name: SuiClientTypes.DynamicFieldName
  ): boolean;

  protected static deriveFieldId(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    return deriveDynamicFieldID(parentId, TypeTagSerializer.parseFromStr(name.type), name.bcs);
  }

  protected static hasErrorCode(error: Error): error is Error & { code: string } {
    return "code" in error && typeof error.code === "string";
  }
}

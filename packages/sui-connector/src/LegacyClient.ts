import { ClientWithCoreApi, SuiClientTypes } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import {
  ObjectOwner,
  SuiJsonRpcClient,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiClient } from "./SuiClient";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

export class LegacyJsonRpcClient implements SuiClient {
  constructor(private readonly client: SuiJsonRpcClient) {}

  getChainIdentifier(): Promise<string> {
    return this.client.getChainIdentifier();
  }

  async getBlockNumber() {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  async getBalance(address: string) {
    const { totalBalance } = await this.client.getBalance({ owner: address });
    return BigInt(totalBalance);
  }

  getReferenceGasPrice() {
    return this.client.getReferenceGasPrice();
  }

  async waitForTransaction(txId: string) {
    const response = await this.client.core.waitForTransaction({ digest: txId });

    return response.$kind === "Transaction";
  }

  async signAndExecute(tx: Transaction, keypair: Keypair) {
    return await this.client.core.signAndExecuteTransaction({
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
    } = await this.client.core.listCoins({
      owner,
      cursor: cursor ?? undefined,
      coinType,
    });

    return { objects, cursor: hasNextPage ? nextCursor : null };
  }

  async getObjects(objectIds: string[]) {
    const result = await this.client.multiGetObjects({
      ids: objectIds,
      options: {
        showBcs: true,
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });

    return result.map((obj) => {
      if (obj.error) {
        throw new Error(`Object fetch failed: ${obj.error.code}`);
      }

      const data = obj.data;
      if (!data) {
        throw new Error("Missing object data");
      }
      if (!data.type) {
        throw new Error(`Missing type for object ${data.objectId}`);
      }
      if (!data.owner) {
        throw new Error(`Missing owner for object ${data.objectId}`);
      }
      if (!data.bcs || data.bcs.dataType !== "moveObject") {
        throw new Error(`Missing BCS for object ${data.objectId}`);
      }
      if (!data.content || data.content.dataType !== "moveObject") {
        throw new Error(`Missing content for object ${data.objectId}`);
      }

      return {
        objectId: data.objectId,
        version: data.version,
        digest: data.digest,
        type: data.type,
        owner: mapOwner(data.owner),
        json: data.content.fields as Record<string, unknown>,
        objectBcs: undefined,
        previousTransaction: undefined,
        content: Buffer.from(data.bcs.bcsBytes, "base64"),
      };
    });
  }

  async getObject(objectId: string) {
    const [obj] = await this.getObjects([objectId]);

    return obj;
  }

  listDynamicFields(params: { parentId: string; limit?: number; cursor?: string }) {
    return this.client.core.listDynamicFields(params);
  }

  async getDynamicFieldValue(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    return await this.client.core.getDynamicField({ parentId, name });
  }

  async getReceivedCoinObjectIds({
    address,
    coinType = SUI_TYPE_ARG,
    limit,
    cursor,
  }: {
    address: string;
    coinType?: string;
    limit: number;
    cursor?: string;
  }) {
    const txs = await this.client.queryTransactionBlocks({
      filter: { ToAddress: address },
      options: { showObjectChanges: true },
      order: "descending",
      limit,
      cursor,
    });

    const objectIds: string[] = [];

    for (const tx of txs.data) {
      for (const change of tx.objectChanges ?? []) {
        if (
          (change.type === "created" || change.type === "mutated") &&
          change.objectType.includes(coinType) &&
          "owner" in change &&
          typeof change.owner === "object" &&
          "AddressOwner" in change.owner &&
          change.owner.AddressOwner === address
        ) {
          objectIds.push(change.objectId);
        }
      }
    }

    const nextCursor = txs.hasNextPage ? (txs.nextCursor ?? undefined) : undefined;

    return {
      objectIds,
      cursor: nextCursor ?? null,
    };
  }

  clientForParallelExecutor(): ClientWithCoreApi {
    return MultiExecutor.createForSubInstances(this, (client) => client.client, {
      getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
      signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
      getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
      core: {
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getObject: MultiExecutor.ExecutionMode.AGREEMENT,
        getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
        listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
        listDynamicFields: MultiExecutor.ExecutionMode.AGREEMENT,
        getChainIdentifier: MultiExecutor.ExecutionMode.AGREEMENT,
        signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      },
    });
  }

  async getTimeForBlock(block: number): Promise<Date> {
    const checkpoint = await this.client.getCheckpoint({
      id: String(block),
    });

    return new Date(Number(checkpoint.timestampMs));
  }

  async queryTransactionBlocks(
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ) {
    return await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: objectId },
          cursor: cursor,
          options,
        }),
    })();
  }
}

function mapOwner(owner: ObjectOwner): SuiClientTypes.ObjectOwner {
  if (owner === "Immutable") {
    return { $kind: "Immutable", Immutable: true };
  }

  if ("AddressOwner" in owner) {
    return { $kind: "AddressOwner", AddressOwner: owner.AddressOwner };
  }

  if ("ObjectOwner" in owner) {
    return { $kind: "ObjectOwner", ObjectOwner: owner.ObjectOwner };
  }

  if ("Shared" in owner) {
    return {
      $kind: "Shared",
      Shared: { initialSharedVersion: owner.Shared.initial_shared_version },
    };
  }

  if ("ConsensusAddressOwner" in owner) {
    return {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: {
        owner: owner.ConsensusAddressOwner.owner,
        startVersion: owner.ConsensusAddressOwner.start_version,
      },
    };
  }

  return { $kind: "Unknown" };
}

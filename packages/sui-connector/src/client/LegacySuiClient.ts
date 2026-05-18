import { SuiJsonRpcClient, SuiTransactionBlockResponseOptions } from "@mysten/sui/jsonRpc";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

export class LegacySuiClient extends SuiClient {
  constructor(private readonly client: SuiJsonRpcClient) {
    super();
  }

  get core() {
    return this.client.core;
  }

  get clientWithCoreApi() {
    return MultiExecutor.createForSubInstances(this, (c: LegacySuiClient) => c.client, {
      ...SUB_INSTANCE_MODES,
      getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
    });
  }

  async getBlockNumber() {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  async getReferenceGasPrice() {
    return await this.client.getReferenceGasPrice();
  }

  async getTimeForBlock(block: number) {
    const checkpoint = await this.client.getCheckpoint({
      id: String(block),
    });

    return new Date(Number(checkpoint.timestampMs));
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

  override readonly queryTransactionBlocks = async (
    objectId: string,
    cursor: string | null | undefined,
    options: SuiTransactionBlockResponseOptions
  ) => {
    return await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: objectId },
          cursor,
          options,
        }),
    })();
  };
}

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { MultiExecutor } from "@redstone-finance/utils";
import { LegacySuiTxLookup } from "./lookup/LegacySuiTxLookup";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

export class LegacySuiClient extends SuiClient {
  private readonly batchingClient: SuiJsonRpcClient;

  constructor(private readonly client: SuiJsonRpcClient) {
    super(client.core);

    this.batchingClient = this.objects.wrapClient(client);
  }

  get clientWithCoreApi() {
    return MultiExecutor.createForSubInstances(this, (c: LegacySuiClient) => c.batchingClient, {
      ...SUB_INSTANCE_MODES,
      getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
    });
  }

  get txLookup() {
    return new LegacySuiTxLookup(this.client);
  }

  async getBlockNumber() {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  protected async fetchReferenceGasPrice() {
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
      cursor: nextCursor,
    };
  }
}

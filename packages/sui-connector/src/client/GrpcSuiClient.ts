import type { SuiClientTypes } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import type { ReceivedTransactionNodes } from "./graphql-types";
import { GraphQLSuiTxLookup } from "./lookup/GraphQLSuiTxLookup";
import { RECEIVED_TRANSACTIONS_QUERY } from "./queries";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

export const MISSING_FIELD_MESSAGE = "Dynamic field not found";
export const MAX_GRAPHQL_PAGE_SIZE = 50;
const COIN_STRUCT_TAG = "0x2::coin::Coin";

export class GrpcSuiClient extends SuiClient {
  protected readonly logger = loggerFactory("sui-grpc-client");
  private readonly batchingClient: SuiGrpcClient;

  constructor(
    private readonly client: SuiGrpcClient,
    private readonly graphqlClient?: SuiGraphQLClient
  ) {
    super(client.core);

    this.batchingClient = this.objects.wrapClient(client);
  }

  get clientWithCoreApi() {
    return MultiExecutor.createForSubInstances(this, (c: GrpcSuiClient) => c.batchingClient, {
      ...SUB_INSTANCE_MODES,
      executeTransaction: MultiExecutor.ExecutionMode.RACE,
    });
  }

  get txLookup() {
    if (!this.graphqlClient) {
      throw new Error("GrpcSuiClient.txLookup requires a GraphQL client");
    }

    return new GraphQLSuiTxLookup(this.graphqlClient);
  }

  async getBlockNumber() {
    const { response } = await this.client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: undefined },
    });
    RedstoneCommon.assert(response.checkpoint, "gRPC returned no checkpoint for the latest block");

    return Number(response.checkpoint.sequenceNumber);
  }

  protected async fetchReferenceGasPrice() {
    const { referenceGasPrice } = await this.client.getReferenceGasPrice();

    return BigInt(referenceGasPrice);
  }

  async getTimeForBlock(block: number) {
    const { response } = await this.client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: "sequenceNumber", sequenceNumber: BigInt(block) },
    });
    const ts = response.checkpoint?.summary?.timestamp;
    if (!ts) {
      throw new Error(`Missing timestamp for checkpoint ${block}`);
    }

    return new Date(Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000));
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
    if (!this.graphqlClient) {
      throw new Error("getReceivedCoinObjectIds requires a GraphQL client");
    }

    const result = await this.graphqlClient.query({
      query: RECEIVED_TRANSACTIONS_QUERY,
      variables: { address, last: Math.min(limit, MAX_GRAPHQL_PAGE_SIZE), before: cursor ?? null },
    });

    if (result.errors?.length) {
      throw new Error(
        `GraphQL errors for address=${address}: ${result.errors.map((e) => e.message).join("; ")}`
      );
    }

    const transactions = result.data?.transactions;
    RedstoneCommon.assert(
      RedstoneCommon.isDefined(transactions),
      `GraphQL returned no transactions for address=${address}`
    );

    const objectIds = this.extractCoinObjectIds(transactions.nodes, coinType, address);
    const { hasPreviousPage, startCursor } = transactions.pageInfo;

    return {
      objectIds,
      cursor: hasPreviousPage ? (startCursor ?? undefined) : undefined,
    };
  }

  protected override isMissingFieldError(
    error: unknown,
    parentId: string,
    name: SuiClientTypes.DynamicFieldName
  ) {
    const message = (error as { message?: unknown } | null)?.message;
    if (typeof message !== "string") {
      return false;
    }

    return (
      message === MISSING_FIELD_MESSAGE ||
      message.includes(GrpcSuiClient.deriveFieldId(parentId, name))
    );
  }

  override async signAndExecute(tx: Transaction, keypair: Keypair) {
    return await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      include: { effects: true, events: true },
    });
  }

  private extractCoinObjectIds(
    txNodes: ReceivedTransactionNodes,
    coinType: string,
    address: string
  ): string[] {
    const objectIds: string[] = [];
    const expectedCoinType = normalizeStructTag(`${COIN_STRUCT_TAG}<${coinType}>`);

    for (const tx of [...txNodes].reverse()) {
      if (tx.sender?.address === address) {
        continue;
      }

      const objectChanges = tx.effects?.objectChanges;
      if (!objectChanges) {
        this.logger.warn(`A transaction affecting ${address} came back without object changes`);
        continue;
      }
      if (objectChanges.pageInfo.hasNextPage) {
        this.logger.warn(
          `Object changes of a transaction affecting ${address} exceed one GraphQL page`
        );
      }

      for (const change of objectChanges.nodes) {
        const output = change.outputState;
        if (!output) {
          continue;
        }

        const moveType = output.asMoveObject?.contents?.type?.repr;
        if (!moveType || normalizeStructTag(moveType) !== expectedCoinType) {
          continue;
        }

        if (
          output.owner &&
          "owner" in output.owner &&
          (output.owner as { owner: { address: string } }).owner.address === address
        ) {
          objectIds.push(output.address);
        }
      }
    }

    return objectIds;
  }
}

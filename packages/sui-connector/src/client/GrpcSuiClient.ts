import { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { RECEIVED_TRANSACTIONS_QUERY, ReceivedTransactionsData } from "./queries";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

export class GrpcSuiClient extends SuiClient {
  constructor(
    private readonly client: SuiGrpcClient,
    private readonly graphqlClient?: SuiGraphQLClient
  ) {
    super();
  }

  get core() {
    return this.client.core;
  }

  get clientWithCoreApi() {
    return MultiExecutor.createForSubInstances(this, (c: GrpcSuiClient) => c.client, {
      ...SUB_INSTANCE_MODES,
      executeTransaction: MultiExecutor.ExecutionMode.RACE,
    });
  }

  async getBlockNumber() {
    const { response } = await this.client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: undefined },
    });

    return Number(response.checkpoint!.sequenceNumber);
  }

  async getReferenceGasPrice() {
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
      variables: { address, first: limit, after: cursor ?? null },
    });

    const data = result.data;

    if (!RedstoneCommon.isDefined(data) || !RedstoneCommon.isDefined(data.transactions)) {
      return { objectIds: [], cursor: null };
    }

    const objectIds = GrpcSuiClient.extractCoinObjectIds(
      data.transactions.nodes,
      coinType,
      address
    );

    const { hasNextPage, endCursor } = data.transactions.pageInfo;

    return {
      objectIds,
      cursor: hasNextPage ? endCursor : null,
    };
  }

  // suiangria sandbox `core` doesn't implement `signAndExecuteTransaction` (only `executeTransaction`);
  // the top-level `client.signAndExecuteTransaction` works in both sandbox and real gRPC, so route through it
  override async signAndExecute(tx: Transaction, keypair: Keypair) {
    return await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      include: { effects: true, events: true },
    });
  }

  private static extractCoinObjectIds(
    txNodes: NonNullable<ReceivedTransactionsData["transactions"]>["nodes"],
    coinType: string,
    address: string
  ): string[] {
    const objectIds: string[] = [];

    for (const tx of txNodes) {
      for (const change of tx.effects!.objectChanges!.nodes) {
        const output = change.outputState;
        if (!output) {
          continue;
        }

        const moveType = output.asMoveObject?.contents?.type!.repr;
        if (!moveType?.includes(coinType)) {
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

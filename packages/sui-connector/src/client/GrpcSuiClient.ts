import type { SuiClientTypes } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { loggerFactory, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { GraphQLSuiTxLookup } from "./lookup/GraphQLSuiTxLookup";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

export const MISSING_FIELD_MESSAGE = "Dynamic field not found";

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
      readMask: { paths: ["summary.timestamp"] },
    });
    const ts = response.checkpoint?.summary?.timestamp;
    if (!ts) {
      throw new Error(`Missing timestamp for checkpoint ${block}`);
    }

    return new Date(Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000));
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
}

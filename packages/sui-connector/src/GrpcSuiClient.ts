import { ClientWithCoreApi, SuiClientTypes } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { PaginatedTransactionResponse } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { OBJECT_INCLUDE, SuiClient } from "./SuiClient";
import { RECEIVED_TRANSACTIONS_QUERY, ReceivedTransactionsData } from "./queries";

export class GrpcSuiClient implements SuiClient {
  constructor(
    private readonly client: SuiGrpcClient,
    private readonly graphqlClient?: SuiGraphQLClient
  ) {}

  async getChainIdentifier() {
    return (await this.client.core.getChainIdentifier()).chainIdentifier;
  }

  async getBlockNumber() {
    const { response } = await this.client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: undefined },
    });

    return Number(response.checkpoint!.sequenceNumber!);
  }

  async getBalance(address: string) {
    const {
      balance: { balance },
    } = await this.client.core.getBalance({ owner: address });
    return BigInt(balance);
  }

  async getReferenceGasPrice() {
    const { referenceGasPrice } = await this.client.getReferenceGasPrice();

    return BigInt(referenceGasPrice);
  }

  async waitForTransaction(txId: string) {
    const response = await this.client.waitForTransaction({ digest: txId });

    return response.$kind === "Transaction";
  }

  async signAndExecute(tx: Transaction, keypair: Keypair) {
    return await this.client.signAndExecuteTransaction({
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
    } = await this.client.listCoins({
      owner,
      cursor: cursor ?? undefined,
      coinType,
    });

    return { objects, cursor: hasNextPage ? nextCursor : null };
  }

  async getObjects(objectIds: string[]) {
    const { objects } = await this.client.core.getObjects({
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

  clientForParallelExecutor(): ClientWithCoreApi {
    return MultiExecutor.createForSubInstances(this, (client) => client.client, {
      signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      executeTransaction: MultiExecutor.ExecutionMode.RACE,
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

  async getTimeForBlock(block: number): Promise<Date> {
    const checkpoint = await this.client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: "sequenceNumber", sequenceNumber: BigInt(block) },
    });

    return new Date(Number(checkpoint.response.checkpoint?.summary?.timestamp));
  }

  queryTransactionBlocks(): Promise<PaginatedTransactionResponse> {
    throw new Error("Method not implemented.");
  }
}

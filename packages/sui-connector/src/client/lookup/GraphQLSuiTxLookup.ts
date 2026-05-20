import { SuiGraphQLClient } from "@mysten/sui/graphql";
import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import type { RawGqlInput, RawGqlTx, RawGqlTxn } from "../graphql-types";
import { AFFECTED_OBJECT_TRANSACTIONS_QUERY } from "../queries";
import {
  computeSuiGasUsed,
  computeSuiIsFailed,
  extractSharedObjectId,
  extractWritePricePayloads,
} from "./SuiTxParsing";

const logger = loggerFactory("grpc-sui-tx-lookup");

const PAGE_SIZE = 50;

const GQL_TYPENAME_PURE = "Pure";
const GQL_TYPENAME_MOVE_VALUE = "MoveValue";
const GQL_TYPENAME_SHARED_INPUT = "SharedInput";
const GQL_TYPENAME_MOVE_CALL = "MoveCallCommand";
const GQL_TYPENAME_INPUT_ARG = "Input";

const GQL_STATUS_FAILURE = "FAILURE";

export class GraphQLSuiTxLookup implements TxLookup {
  constructor(private readonly graphqlClient: SuiGraphQLClient) {}

  async fetchPage({ adapterContract, cursor }: TxLookupArgs) {
    const result = await this.graphqlClient.query({
      query: AFFECTED_OBJECT_TRANSACTIONS_QUERY,
      variables: { objectId: adapterContract, last: PAGE_SIZE, before: cursor },
    });

    if (result.errors?.length) {
      const message = result.errors.map((e) => e.message).join("; ");
      throw new Error(`GraphQL errors for objectId=${adapterContract}: ${message}`);
    }

    const transactions = result.data?.transactions;
    if (!transactions) {
      throw new Error(`GraphQL returned no transactions for objectId=${adapterContract}`);
    }

    const data = [...transactions.nodes]
      .reverse()
      .flatMap((tx) => GraphQLSuiTxLookup.normalize(tx as unknown as RawGqlTx));

    logger.debug(
      `Fetched ${data.length} txs for objectId=${adapterContract} cursor=${cursor ?? "<none>"} hasPrev=${transactions.pageInfo.hasPreviousPage} startCursor=${transactions.pageInfo.startCursor ?? "<none>"}`
    );

    return {
      data,
      hasNextPage: transactions.pageInfo.hasPreviousPage,
      nextCursor: transactions.pageInfo.startCursor ?? undefined,
    };
  }

  private static normalize(tx: RawGqlTx) {
    const inputs = GraphQLSuiTxLookup.parseInputs(tx.kind?.inputs?.nodes ?? []);
    const moveCalls = GraphQLSuiTxLookup.parseMoveCalls(tx.kind?.commands?.nodes ?? []);
    const payloads = extractWritePricePayloads(inputs, moveCalls);
    const targetObjectId = extractSharedObjectId(inputs);

    if (!payloads.length || !targetObjectId) {
      return [];
    }

    const events = (tx.effects?.events?.nodes ?? []).map((node) => ({
      type: node.contents?.type?.repr ?? "",
    }));
    const isFailure = (tx.effects?.status ?? "") === GQL_STATUS_FAILURE;
    const effectStatus = isFailure ? "failure" : "success";
    const isFailed = computeSuiIsFailed(effectStatus, events);

    const gas = tx.effects?.gasEffects?.gasSummary ?? {};
    const gasUsed = computeSuiGasUsed({
      computationCost: gas.computationCost ?? "0",
      storageCost: gas.storageCost ?? "0",
      storageRebate: gas.storageRebate ?? "0",
      nonRefundableStorageFee: gas.nonRefundableStorageFee ?? "0",
    });

    const blockNumber = Number(tx.effects?.checkpoint?.sequenceNumber ?? 0);
    const blockTimestamp = tx.effects?.checkpoint?.timestamp
      ? RedstoneCommon.msToSecs(new Date(tx.effects.checkpoint.timestamp).getTime())
      : 0;

    return payloads.map((payload) => ({
      blockNumber,
      blockTimestamp,
      hash: tx.digest ?? "",
      from: tx.sender?.address ?? "",
      to: targetObjectId,
      data: payload,
      gasLimit: String(tx.gasInput?.gasBudget ?? "0"),
      gasPrice: String(tx.gasInput?.gasPrice ?? "0"),
      isFailed,
      gasUsed,
    }));
  }

  private static parseInputs(rawInputs: RawGqlInput[]) {
    return rawInputs.map((input) => {
      if (input.__typename === GQL_TYPENAME_PURE && typeof input.bytes === "string") {
        return { kind: "pure" as const, rawValue: Buffer.from(input.bytes, "base64") };
      }
      if (input.__typename === GQL_TYPENAME_MOVE_VALUE && typeof input.bcs === "string") {
        return { kind: "pure" as const, rawValue: Buffer.from(input.bcs, "base64") };
      }
      if (input.__typename === GQL_TYPENAME_SHARED_INPUT && typeof input.address === "string") {
        return { kind: "shared" as const, objectId: input.address };
      }

      return { kind: "other" as const };
    });
  }

  private static parseMoveCalls(rawTxns: RawGqlTxn[]) {
    return rawTxns
      .filter((t) => t.__typename === GQL_TYPENAME_MOVE_CALL)
      .filter((t): t is RawGqlTxn & { function: { name: string } } => !!t.function?.name)
      .map((t) => ({
        functionName: t.function.name,
        argInputIxs: (t.arguments ?? []).map((arg) =>
          arg.__typename === GQL_TYPENAME_INPUT_ARG && typeof arg.ix === "number"
            ? arg.ix
            : undefined
        ),
      }));
  }
}

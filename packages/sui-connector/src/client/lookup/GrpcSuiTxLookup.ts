import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { loggerFactory } from "@redstone-finance/utils";
import { hexlify } from "ethers/lib/utils";
import type { RawGqlInput, RawGqlTx, RawGqlTxn } from "../graphql-types";
import { AFFECTED_OBJECT_TRANSACTIONS_QUERY } from "../queries";
import type { NormalizedSuiTx, SuiTxLookup, SuiTxLookupPage } from "./SuiTxLookup";
import {
  extractSharedObjectId,
  extractWritePricePayloads,
  ParsedInput,
  ParsedMoveCall,
} from "./SuiTxParsing";

const logger = loggerFactory("grpc-sui-tx-lookup");

const PAGE_SIZE = 50;

const GQL_TYPENAME_PURE = "Pure";
const GQL_TYPENAME_MOVE_VALUE = "MoveValue";
const GQL_TYPENAME_SHARED_INPUT = "SharedInput";
const GQL_TYPENAME_MOVE_CALL = "MoveCallCommand";
const GQL_TYPENAME_INPUT_ARG = "Input";

const GQL_STATUS_FAILURE = "failure";
const STATUS_FAILURE = "failure";
const STATUS_SUCCESS = "success";

export class GrpcSuiTxLookup implements SuiTxLookup {
  constructor(private readonly graphqlClient: SuiGraphQLClient) {}

  async queryAffectedObjectTransactions({
    objectId,
    cursor,
  }: {
    objectId: string;
    cursor?: string;
  }): Promise<SuiTxLookupPage> {
    const result = await this.graphqlClient.query({
      query: AFFECTED_OBJECT_TRANSACTIONS_QUERY,
      variables: { objectId, last: PAGE_SIZE, before: cursor },
    });

    if (result.errors?.length) {
      const message = result.errors.map((e) => e.message).join("; ");
      throw new Error(`GraphQL errors for objectId=${objectId}: ${message}`);
    }

    const transactions = result.data?.transactions;
    if (!transactions) {
      throw new Error(`GraphQL returned no transactions for objectId=${objectId}`);
    }

    const data = [...transactions.nodes]
      .reverse()
      .map((tx) => GrpcSuiTxLookup.normalize(tx as unknown as RawGqlTx));

    logger.debug(
      `Fetched ${data.length} txs for objectId=${objectId} cursor=${cursor ?? "<none>"} hasPrev=${transactions.pageInfo.hasPreviousPage} startCursor=${transactions.pageInfo.startCursor ?? "<none>"}`
    );

    return {
      data,
      hasNextPage: transactions.pageInfo.hasPreviousPage,
      nextCursor: transactions.pageInfo.startCursor ?? undefined,
    };
  }

  private static normalize(tx: RawGqlTx): NormalizedSuiTx {
    const inputs = GrpcSuiTxLookup.parseInputs(tx.kind?.inputs?.nodes ?? []);
    const moveCalls = GrpcSuiTxLookup.parseMoveCalls(tx.kind?.commands?.nodes ?? []);

    return {
      checkpoint: Number(tx.effects?.checkpoint?.sequenceNumber ?? 0),
      timestampMs: tx.effects?.checkpoint?.timestamp
        ? new Date(tx.effects.checkpoint.timestamp).getTime()
        : 0,
      digest: tx.digest ?? "",
      sender: tx.sender?.address ?? "",
      gasBudget: String(tx.gasInput?.gasBudget ?? "0"),
      gasPrice: String(tx.gasInput?.gasPrice ?? "0"),
      writePricePayloads: extractWritePricePayloads(inputs, moveCalls),
      targetObjectId: extractSharedObjectId(inputs),
      effects: GrpcSuiTxLookup.normalizeEffects(tx.effects),
      events: GrpcSuiTxLookup.normalizeEvents(tx.effects),
    };
  }

  private static normalizeEffects(effects: RawGqlTx["effects"]) {
    const gas = effects?.gasEffects?.gasSummary ?? {};
    const isFailure = (effects?.status ?? "").toLowerCase() === GQL_STATUS_FAILURE;

    return {
      status: { status: isFailure ? STATUS_FAILURE : STATUS_SUCCESS },
      gasUsed: {
        computationCost: gas.computationCost ?? "0",
        storageCost: gas.storageCost ?? "0",
        storageRebate: gas.storageRebate ?? "0",
        nonRefundableStorageFee: gas.nonRefundableStorageFee ?? "0",
      },
    };
  }

  private static normalizeEvents(effects: RawGqlTx["effects"]) {
    const eventNodes = effects?.events?.nodes ?? [];

    return eventNodes.map((node) => ({ type: node.contents?.type?.repr ?? "" }));
  }

  private static parseInputs(rawInputs: RawGqlInput[]): ParsedInput[] {
    return rawInputs.map((input) => {
      if (input.__typename === GQL_TYPENAME_PURE && typeof input.bytes === "string") {
        return { kind: "pure", hexBytes: hexlify(Buffer.from(input.bytes, "base64")) };
      }
      if (input.__typename === GQL_TYPENAME_MOVE_VALUE && typeof input.bcs === "string") {
        return { kind: "pure", hexBytes: hexlify(Buffer.from(input.bcs, "base64")) };
      }
      if (input.__typename === GQL_TYPENAME_SHARED_INPUT && typeof input.address === "string") {
        return { kind: "shared", objectId: input.address };
      }

      return { kind: "other" };
    });
  }

  private static parseMoveCalls(rawTxns: RawGqlTxn[]): ParsedMoveCall[] {
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

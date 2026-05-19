import {
  SuiJsonRpcClient,
  SuiTransactionBlockResponse,
  TransactionBlockData,
} from "@mysten/sui/jsonRpc";
import { RedstoneCommon } from "@redstone-finance/utils";
import { hexlify } from "ethers/lib/utils";
import type { NormalizedSuiTx, SuiTxLookup, SuiTxLookupPage } from "./SuiTxLookup";
import {
  extractSharedObjectId,
  extractWritePricePayloads,
  ParsedInput,
  ParsedMoveCall,
} from "./SuiTxParsing";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

const KIND_PROGRAMMABLE_TRANSACTION = "ProgrammableTransaction";
const TXN_DISCRIMINATOR_MOVE_CALL = "MoveCall";
const INPUT_TYPE_PURE = "pure";
const INPUT_TYPE_OBJECT = "object";
const OBJECT_TYPE_SHARED = "sharedObject";
const ARG_DISCRIMINATOR_INPUT = "Input";

export class LegacySuiTxLookup implements SuiTxLookup {
  constructor(private readonly client: SuiJsonRpcClient) {}

  async queryAffectedObjectTransactions({
    objectId,
    cursor,
  }: {
    objectId: string;
    cursor?: string;
  }): Promise<SuiTxLookupPage> {
    const response = await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: objectId },
          cursor: cursor ?? null,
          options: { showInput: true, showEffects: true, showEvents: true },
        }),
    })();

    return {
      data: response.data.map((tx) => LegacySuiTxLookup.normalize(tx)),
      hasNextPage: response.hasNextPage,
      nextCursor: response.nextCursor ?? undefined,
    };
  }

  private static normalize(tx: SuiTransactionBlockResponse): NormalizedSuiTx {
    const transactionData = tx.transaction!.data;
    const inputs = LegacySuiTxLookup.parseInputs(transactionData);
    const moveCalls = LegacySuiTxLookup.parseMoveCalls(transactionData);

    return {
      checkpoint: Number(tx.checkpoint ?? "0"),
      timestampMs: Number(tx.timestampMs ?? "0"),
      digest: tx.digest,
      sender: transactionData.sender,
      gasBudget: transactionData.gasData.budget,
      gasPrice: transactionData.gasData.price,
      writePricePayloads: extractWritePricePayloads(inputs, moveCalls),
      targetObjectId: extractSharedObjectId(inputs),
      effects: tx.effects,
      events: tx.events,
    };
  }

  private static parseInputs(transactionData: TransactionBlockData): ParsedInput[] {
    if (transactionData.transaction.kind !== KIND_PROGRAMMABLE_TRANSACTION) {
      return [];
    }

    return transactionData.transaction.inputs.map((input) => {
      if (input.type === INPUT_TYPE_PURE) {
        return { kind: "pure", hexBytes: hexlify(input.value as number[]) };
      }
      if (input.type === INPUT_TYPE_OBJECT && input.objectType === OBJECT_TYPE_SHARED) {
        return { kind: "shared", objectId: input.objectId };
      }

      return { kind: "other" };
    });
  }

  private static parseMoveCalls(transactionData: TransactionBlockData): ParsedMoveCall[] {
    if (transactionData.transaction.kind !== KIND_PROGRAMMABLE_TRANSACTION) {
      return [];
    }

    return transactionData.transaction.transactions
      .filter((t) => TXN_DISCRIMINATOR_MOVE_CALL in t)
      .map((t) => ({
        functionName: t.MoveCall.function,
        argInputIxs: (t.MoveCall.arguments ?? []).map((arg) =>
          typeof arg === "object" && ARG_DISCRIMINATOR_INPUT in arg ? arg.Input : undefined
        ),
      }));
  }
}

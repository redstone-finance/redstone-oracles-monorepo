import {
  SuiJsonRpcClient,
  SuiTransactionBlockResponse,
  TransactionBlockData,
} from "@mysten/sui/jsonRpc";
import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  computeSuiGasUsed,
  computeSuiIsFailed,
  extractSharedObjectId,
  extractWritePricePayloads,
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

export class LegacySuiTxLookup implements TxLookup {
  constructor(private readonly client: SuiJsonRpcClient) {}

  async fetchPage({ adapterContract, cursor }: TxLookupArgs) {
    const response = await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: adapterContract },
          cursor: cursor ?? null,
          options: { showInput: true, showEffects: true, showEvents: true },
        }),
    })();

    return {
      data: response.data.flatMap((tx) => LegacySuiTxLookup.normalize(tx)),
      hasNextPage: response.hasNextPage,
      nextCursor: response.nextCursor ?? undefined,
    };
  }

  private static normalize(tx: SuiTransactionBlockResponse) {
    const transactionData = tx.transaction!.data;
    const inputs = LegacySuiTxLookup.parseInputs(transactionData);
    const moveCalls = LegacySuiTxLookup.parseMoveCalls(transactionData);
    const payloads = extractWritePricePayloads(inputs, moveCalls);
    const targetObjectId = extractSharedObjectId(inputs);

    if (!payloads.length || !targetObjectId) {
      return [];
    }

    const effects = tx.effects;
    const events = (tx.events ?? []).map((e) => ({ type: e.type }));
    const isFailed = computeSuiIsFailed(effects?.status.status ?? "", events);
    const gasUsed = effects?.gasUsed ? computeSuiGasUsed(effects.gasUsed) : 0;

    const checkpoint = Number(tx.checkpoint ?? "0");
    const timestampSec = RedstoneCommon.msToSecs(Number(tx.timestampMs ?? "0"));

    return payloads.map((payload) => ({
      blockNumber: checkpoint,
      blockTimestamp: timestampSec,
      hash: tx.digest,
      from: transactionData.sender,
      to: targetObjectId,
      data: payload,
      gasLimit: transactionData.gasData.budget,
      gasPrice: transactionData.gasData.price,
      isFailed,
      gasUsed,
    }));
  }

  private static parseInputs(transactionData: TransactionBlockData) {
    if (transactionData.transaction.kind !== KIND_PROGRAMMABLE_TRANSACTION) {
      return [];
    }

    return transactionData.transaction.inputs.map((input) => {
      if (input.type === INPUT_TYPE_PURE) {
        return { kind: "pure" as const, rawValue: input.value };
      }
      if (input.type === INPUT_TYPE_OBJECT && input.objectType === OBJECT_TYPE_SHARED) {
        return { kind: "shared" as const, objectId: input.objectId };
      }

      return { kind: "other" as const };
    });
  }

  private static parseMoveCalls(transactionData: TransactionBlockData) {
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

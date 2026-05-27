import {
  SuiJsonRpcClient,
  SuiTransactionBlockResponse,
  TransactionBlockData,
} from "@mysten/sui/jsonRpc";
import { ManifestRef, PerManifestTxLookup } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  buildNormalizedSuiTx,
  computeOldestBlockInPage,
  computeSuiGasUsed,
  computeSuiIsFailed,
  extractSharedObjectId,
  extractWritePricePayloads,
  filterSuiTxsAndCheckHasNextPage,
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

export class LegacySuiTxLookup extends PerManifestTxLookup {
  constructor(private readonly client: SuiJsonRpcClient) {
    super();
  }

  protected override async fetchForManifest(
    manifest: ManifestRef,
    startBlock: number,
    endBlock: number,
    cursor?: string
  ) {
    const response = await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.client.queryTransactionBlocks({
          filter: { InputObject: manifest.adapterContract },
          cursor: cursor ?? null,
          options: { showInput: true, showEffects: true, showEvents: true },
        }),
    })();

    const allFromPage = response.data.flatMap((tx) => LegacySuiTxLookup.normalize(tx));

    const oldestRawBlockInPage = computeOldestBlockInPage(response.data, (tx) =>
      Number(tx.checkpoint ?? 0)
    );

    const { data, hasMoreInRange } = filterSuiTxsAndCheckHasNextPage(
      allFromPage,
      startBlock,
      endBlock,
      response.hasNextPage,
      oldestRawBlockInPage
    );

    if (hasMoreInRange && response.nextCursor) {
      return { data, hasNextPage: true as const, nextCursor: response.nextCursor };
    }

    return { data, hasNextPage: false as const };
  }

  private static normalize(tx: SuiTransactionBlockResponse) {
    const transactionData = tx.transaction!.data;
    const inputs = LegacySuiTxLookup.parseInputs(transactionData);
    const moveCalls = LegacySuiTxLookup.parseMoveCalls(transactionData);
    const payloads = extractWritePricePayloads(inputs, moveCalls);
    const targetObjectId = extractSharedObjectId(inputs, moveCalls);

    if (!payloads.length || !targetObjectId) {
      return [];
    }

    const effects = tx.effects;
    const events = (tx.events ?? []).map((e) => ({ type: e.type }));
    const isFailed = computeSuiIsFailed(effects?.status.status ?? "", events);
    const gasUsed = effects?.gasUsed ? computeSuiGasUsed(effects.gasUsed) : 0;

    const checkpoint = Number(tx.checkpoint ?? "0");
    const timestampSec = RedstoneCommon.msToSecs(Number(tx.timestampMs ?? "0"));

    return buildNormalizedSuiTx({
      blockNumber: checkpoint,
      blockTimestamp: timestampSec,
      hash: tx.digest,
      sender: transactionData.sender,
      targetObjectId,
      payloads,
      gasLimit: transactionData.gasData.budget,
      gasPrice: transactionData.gasData.price,
      isFailed,
      gasUsed,
    });
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

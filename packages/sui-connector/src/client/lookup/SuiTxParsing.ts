import {
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  NormalizedContractTx,
} from "@redstone-finance/multichain-kit";
import { hexlify } from "ethers/lib/utils";

export const WRITE_PRICE_FUNCTIONS = ["write_price", "try_write_price"];
export const PAYLOAD_ARG_ID = 2;
// write_price(adapter, _, payload): the shared price-adapter object is argument 0 of the call
export const SHARED_OBJECT_ARG_ID = 0;

export const SUI_UPDATE_ERROR_EVENT_FRAGMENT = "price_adapter::UpdateError";
export const SUI_EFFECT_STATUS_FAILURE = "failure";

export interface SuiNormalizedGas {
  computationCost: string;
  storageCost: string;
  storageRebate: string;
  nonRefundableStorageFee: string;
}

export function computeSuiIsFailed(effectStatus: string, events: { type: string }[]) {
  const hasErrorEvent = events.some((e) => e.type.includes(SUI_UPDATE_ERROR_EVENT_FRAGMENT));

  return effectStatus === SUI_EFFECT_STATUS_FAILURE || hasErrorEvent;
}

export function computeSuiGasUsed(gas: SuiNormalizedGas) {
  return (
    Number(gas.computationCost) +
    Number(gas.storageCost) -
    Number(gas.storageRebate) +
    Number(gas.nonRefundableStorageFee)
  );
}

export type ParsedInput =
  | { kind: "pure"; rawValue: unknown }
  | { kind: "shared"; objectId: string }
  | { kind: "other" };

export interface ParsedMoveCall {
  functionName: string;
  argInputIxs: (number | undefined)[];
}

export function extractWritePricePayloads(inputs: ParsedInput[], moveCalls: ParsedMoveCall[]) {
  return moveCalls
    .filter((mc) => WRITE_PRICE_FUNCTIONS.includes(mc.functionName))
    .map((mc) => mc.argInputIxs[PAYLOAD_ARG_ID])
    .filter((ix): ix is number => typeof ix === "number")
    .map((ix) => inputs[ix])
    .filter((input): input is Extract<ParsedInput, { kind: "pure" }> => input.kind === "pure")
    .map((input) => pureValueToHex(input.rawValue))
    .filter((hex): hex is string => hex !== undefined);
}

function pureValueToHex(value: unknown) {
  if (typeof value === "string") {
    return hexlify(Uint8Array.from(value, (c) => c.charCodeAt(0)));
  }
  if (Array.isArray(value) || value instanceof Uint8Array) {
    return hexlify(value);
  }

  return undefined;
}

export function extractSharedObjectId(inputs: ParsedInput[], moveCalls: ParsedMoveCall[]) {
  const writeCall = moveCalls.find((mc) => WRITE_PRICE_FUNCTIONS.includes(mc.functionName));
  const inputIx = writeCall?.argInputIxs[SHARED_OBJECT_ARG_ID];
  if (inputIx === undefined) {
    return undefined;
  }

  const input = inputs[inputIx] as ParsedInput | undefined;

  return input?.kind === "shared" ? input.objectId : undefined;
}

export interface BuildNormalizedTxParams {
  blockNumber: number;
  blockTimestamp: number;
  hash: string;
  sender: string;
  targetObjectId: string;
  payloads: string[];
  gasLimit: string;
  gasPrice: string;
  isFailed: boolean;
  gasUsed: number;
}

export function buildNormalizedSuiTx(params: BuildNormalizedTxParams) {
  return params.payloads.map((payload) => ({
    blockNumber: params.blockNumber,
    blockTimestamp: params.blockTimestamp,
    hash: params.hash,
    from: params.sender,
    to: params.targetObjectId,
    data: payload,
    gasLimit: params.gasLimit,
    gasPrice: params.gasPrice,
    isFailed: params.isFailed,
    gasUsed: params.gasUsed,
    functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  }));
}

export function filterSuiTxsAndCheckHasNextPage(
  allFromPage: NormalizedContractTx[],
  startBlock: number,
  endBlock: number,
  pageHasPreviousPage: boolean,
  oldestRawBlockInPage?: number
) {
  const data = allFromPage.filter(
    (tx) => tx.blockNumber >= startBlock && tx.blockNumber <= endBlock
  );

  const hasMoreInRange =
    pageHasPreviousPage &&
    (oldestRawBlockInPage === undefined || oldestRawBlockInPage >= startBlock);

  return { data, hasMoreInRange };
}

export function computeOldestBlockInPage<T>(rawNodes: T[], extractBlock: (node: T) => number) {
  const oldest = rawNodes.reduce((min, node) => {
    const blockNumber = extractBlock(node);

    return Number.isFinite(blockNumber) && blockNumber > 0 ? Math.min(min, blockNumber) : min;
  }, Number.POSITIVE_INFINITY);

  return oldest === Number.POSITIVE_INFINITY ? undefined : oldest;
}

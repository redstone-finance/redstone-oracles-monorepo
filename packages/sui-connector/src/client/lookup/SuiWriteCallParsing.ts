import { bcs } from "@mysten/sui/bcs";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { arrayify, BytesLike, hexlify } from "ethers/lib/utils";

const WRITE_PRICE_FUNCTIONS = ["write_price", "try_write_price"];
const SHARED_OBJECT_ARG_ID = 0;
const FEED_ID_ARG_ID = 1;
const PAYLOAD_ARG_ID = 2;

type ParsedInput =
  | { kind: "pure"; rawValue: unknown }
  | { kind: "shared"; objectId: string }
  | { kind: "other" };

interface ParsedMoveCall {
  functionName: string;
  argInputIxs: (number | undefined)[];
}

export interface SuiWriteCall {
  feedId: string;
  payload: string;
}

export function extractWritePriceCalls(inputs: ParsedInput[], moveCalls: ParsedMoveCall[]) {
  return filterWriteCalls(moveCalls)
    .map((moveCall) => toWriteCall(inputs, moveCall))
    .filter(RedstoneCommon.isDefined);
}

function toWriteCall(inputs: ParsedInput[], moveCall: ParsedMoveCall) {
  const feedId = decodeFeedId(resolvePureValue(inputs, moveCall, FEED_ID_ARG_ID));
  const payload = encodePayload(resolvePureValue(inputs, moveCall, PAYLOAD_ARG_ID));

  return RedstoneCommon.isDefined(feedId) && RedstoneCommon.isDefined(payload)
    ? { feedId, payload }
    : undefined;
}

export function extractSharedObjectId(inputs: ParsedInput[], moveCalls: ParsedMoveCall[]) {
  const writeCall = filterWriteCalls(moveCalls).at(0);
  if (!writeCall) {
    return undefined;
  }

  const input = resolveInput(inputs, writeCall, SHARED_OBJECT_ARG_ID);

  return input?.kind === "shared" ? input.objectId : undefined;
}

function filterWriteCalls(moveCalls: ParsedMoveCall[]) {
  return moveCalls.filter((moveCall) => WRITE_PRICE_FUNCTIONS.includes(moveCall.functionName));
}

function resolveInput(inputs: ParsedInput[], moveCall: ParsedMoveCall, argId: number) {
  const inputIx = moveCall.argInputIxs[argId];

  return inputIx === undefined ? undefined : inputs[inputIx];
}

function resolvePureValue(inputs: ParsedInput[], moveCall: ParsedMoveCall, argId: number) {
  const input = resolveInput(inputs, moveCall, argId);

  return input?.kind === "pure" ? input.rawValue : undefined;
}

function decodeFeedId(rawValue: unknown) {
  if (typeof rawValue === "string") {
    return rawValue.replace(/\0+$/, "");
  }

  try {
    return ContractParamsProvider.unhexlifyFeedId(
      bcs.vector(bcs.u8()).parse(arrayify(rawValue as BytesLike))
    );
  } catch {
    return undefined;
  }
}

function encodePayload(rawValue: unknown) {
  try {
    return hexlify(rawValue as BytesLike);
  } catch {
    return undefined;
  }
}

import { hexlify } from "ethers/lib/utils";

export const WRITE_PRICE_FUNCTIONS = ["write_price", "try_write_price"];
export const PAYLOAD_ARG_ID = 2;
export const SHARED_OBJECT_INPUT_ID = 0;

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

export function extractSharedObjectId(inputs: ParsedInput[]) {
  const input = inputs[SHARED_OBJECT_INPUT_ID] as ParsedInput | undefined;

  return input?.kind === "shared" ? input.objectId : undefined;
}

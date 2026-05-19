import { hexlify } from "ethers/lib/utils";

export const WRITE_PRICE_FUNCTIONS = ["write_price", "try_write_price"];
export const PAYLOAD_ARG_ID = 2;
export const SHARED_OBJECT_INPUT_ID = 0;

export type ParsedInput =
  | { kind: "pure"; rawValue: unknown }
  | { kind: "shared"; objectId: string }
  | { kind: "other" };

export interface ParsedMoveCall {
  functionName: string;
  argInputIxs: (number | undefined)[];
}

export function extractWritePricePayloads(
  inputs: ParsedInput[],
  moveCalls: ParsedMoveCall[]
): string[] {
  return moveCalls
    .filter((mc) => WRITE_PRICE_FUNCTIONS.includes(mc.functionName))
    .map((mc) => mc.argInputIxs[PAYLOAD_ARG_ID])
    .filter((ix): ix is number => typeof ix === "number")
    .map((ix) => inputs[ix])
    .filter((input): input is Extract<ParsedInput, { kind: "pure" }> => input.kind === "pure")
    .map((input) => pureValueToHex(input.rawValue))
    .filter((hex): hex is string => hex !== undefined);
}

export function extractSharedObjectId(inputs: ParsedInput[]): string | undefined {
  const input = inputs[SHARED_OBJECT_INPUT_ID] as ParsedInput | undefined;

  return input?.kind === "shared" ? input.objectId : undefined;
}

function pureValueToHex(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return hexlify(value as number[]);
  }
  if (value instanceof Uint8Array) {
    return hexlify(value);
  }
  if (typeof value === "string") {
    return hexlify(Uint8Array.from(value, (c) => c.charCodeAt(0)));
  }

  return undefined;
}

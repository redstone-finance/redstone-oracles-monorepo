import { BigNumber } from "@ethersproject/bignumber";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Result } from "ethers-v6";

export function toV5BigNumber(value: unknown): unknown {
  if (typeof value === "bigint") {
    return BigNumber.from(value);
  }

  if (value instanceof Result) {
    return resultToV5(value);
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map(toV5BigNumber);
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (RedstoneCommon.isDefined(value) && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        toV5BigNumber(entry),
      ])
    );
  }

  return value;
}

function resultToV5(result: Result) {
  try {
    const entries = Object.entries(result.toObject());
    const values = entries.map(([, value]) => toV5BigNumber(value)) as unknown[] &
      Record<string, unknown>;
    entries.forEach(([name], index) => {
      values[name] = values[index];
    });

    return values;
  } catch {
    return result.toArray().map(toV5BigNumber);
  }
}

export function toV6Arg(value: unknown): unknown {
  if (BigNumber.isBigNumber(value)) {
    return value.toBigInt();
  }

  if (Array.isArray(value)) {
    return value.map(toV6Arg);
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (RedstoneCommon.isDefined(value) && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toV6Arg(entry)])
    );
  }

  return value;
}

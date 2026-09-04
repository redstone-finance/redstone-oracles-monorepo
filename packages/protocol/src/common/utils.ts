import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike, arrayify, hexlify, isHexString, zeroPad } from "@ethersproject/bytes";
import { formatBytes32String } from "@ethersproject/strings";
import { parseUnits } from "@ethersproject/units";
import { keccak256 } from "@redstone-finance/signing";
import Decimal from "decimal.js";

export type NumberLike = number | string;
export type ConvertibleToBytes32 = string;

const ZERO_EX_PREFIX_LENGTH = 2; // length of string "0x"
const UTF8_ENCODER = new TextEncoder();

export const assert = (condition: boolean, errMsg?: string) => {
  if (!condition) {
    const errText = `Assertion failed` + (errMsg ? `: ${errMsg}` : "");

    throw new Error(errText);
  }
};

export const convertStringToBytes32 = (str: string): Uint8Array =>
  str.length > 31
    ? keccak256(isHexString(str) ? str : UTF8_ENCODER.encode(str))
    : arrayify(formatBytes32String(str));

export const convertNumberToBytes = (
  value: NumberLike,
  decimals: number,
  byteSize: number
): Uint8Array => {
  const stringifiedNumber = convertNumberToString(value, decimals);
  const bigNumberValue = parseUnits(stringifiedNumber, decimals);
  const bytesValue = arrayify(bigNumberValue.toHexString());

  if (byteSize < bytesValue.length) {
    throw new Error(
      `Overflow: ` + `value: ${value}, ` + `decimals: ${decimals}, ` + `byteSize: ${byteSize}`
    );
  } else {
    return zeroPad(bytesValue, byteSize);
  }
};

export const convertNumberToString = (value: NumberLike, decimals: number): string => {
  if (typeof value === "string") {
    // It would be ideal to have this implementation
    // for all types, but implementing it would break
    // compatibility with existing clients
    const decimalValue = new Decimal(value);

    return decimalValue.toFixed(decimals);
  }

  const stringifiedNumber = Number(value).toFixed(decimals);

  if (!stringifiedNumber.includes("e")) {
    return stringifiedNumber;
  }

  // js for numbers >1e20 uses scientific notation,
  // which is not supported by BigNumber.js
  return Number(stringifiedNumber).toLocaleString("fullwide", {
    useGrouping: false,
  });
};

export const convertNumberToFixed = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

export const convertIntegerNumberToBytes = (value: NumberLike, byteSize: number): Uint8Array => {
  assert(Number.isInteger(Number(value)), "convertIntegerNumberToBytes expects integer as input");
  const decimals = 0; // 0 digits after comma

  return convertNumberToBytes(value, decimals, byteSize);
};

export const convertBytesToNumber = (bytes: Uint8Array): number => BigNumber.from(bytes).toNumber();

export const hexlifyWithout0xPrefix = (value: BytesLike): string => {
  return hexlify(value).slice(ZERO_EX_PREFIX_LENGTH);
};

export function useDefaultIfUndefined<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

// the concat utility from ethers 6 returns hex string instead of byte array, so we copied ethers 5 version instead
export const concat = (items: Uint8Array[]): Uint8Array => {
  const length = items.reduce((acc, item) => acc + item.length, 0);
  const result = new Uint8Array(length);

  items.reduce((offset, item) => {
    result.set(item, offset);

    return offset + item.length;
  }, 0);

  return result;
};

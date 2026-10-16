import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import Decimal from "decimal.js";
import { getOrSet } from "./maps";
import { getNS } from "./misc";

export type UnitValue = string | number | bigint | BigNumber | Decimal;

const ETHER_DECIMALS = 18;
const UINT256_DIGIT_COUNT = 78;

const UnitDecimal = Decimal.clone({
  precision: UINT256_DIGIT_COUNT,
  toExpNeg: -UINT256_DIGIT_COUNT,
  toExpPos: UINT256_DIGIT_COUNT,
});
const POWERS_OF_TEN = new Map<number, Decimal>();

export function parseUnits(value: UnitValue, decimals: number = ETHER_DECIMALS) {
  return BigNumber.from(scaledUnits(value, decimals));
}

export function parseUnitsToBigInt(value: UnitValue, decimals: number = ETHER_DECIMALS) {
  return BigInt(scaledUnits(value, decimals));
}

export function formatUnits(value: BigNumberish, decimals: number = ETHER_DECIMALS) {
  const formatted = new UnitDecimal(`${BigNumber.from(value).toString()}e-${decimals}`).toFixed();

  return formatted.includes(".") ? formatted : `${formatted}.0`;
}

export function parseEther(value: UnitValue) {
  return parseUnits(value, ETHER_DECIMALS);
}

export function formatEther(value: BigNumberish) {
  return formatUnits(value, ETHER_DECIMALS);
}

export function powerOfTen(exponent: number) {
  return getOrSet(POWERS_OF_TEN, exponent, () => UnitDecimal.pow(10, exponent));
}

function scaledUnits(value: UnitValue, decimals: number) {
  const decimal = new UnitDecimal(Decimal.isDecimal(value) ? value : value.toString());

  if (!decimal.isFinite()) {
    throw new Error(`invalid decimal value: ${value.toString()}`);
  }

  if (decimal.decimalPlaces() > decimals) {
    throw new Error(
      `Fractional component of ${value.toString()} exceeds ${getNS(decimals, "decimal")}`
    );
  }

  return decimal.mul(powerOfTen(decimals)).toFixed(0);
}

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import Decimal from "decimal.js";
import { getNS } from "./misc";

export type UnitValue = string | number | bigint | BigNumber;

const ETHER_DECIMALS = 18;
const UINT256_DIGIT_COUNT = 78;

const UnitDecimal = Decimal.clone({
  precision: UINT256_DIGIT_COUNT,
  toExpNeg: -UINT256_DIGIT_COUNT,
  toExpPos: UINT256_DIGIT_COUNT,
});

export function parseUnits(value: UnitValue, decimals: number = ETHER_DECIMALS) {
  const decimal = new UnitDecimal(value.toString());

  if (!decimal.isFinite()) {
    throw new Error(`invalid decimal value: ${value.toString()}`);
  }

  if (decimal.decimalPlaces() > decimals) {
    throw new Error(
      `Fractional component of ${value.toString()} exceeds ${getNS(decimals, "decimal")}`
    );
  }

  return BigNumber.from(decimal.mul(UnitDecimal.pow(10, decimals)).toFixed(0));
}

export function formatUnits(value: BigNumberish, decimals: number = ETHER_DECIMALS) {
  const formatted = new UnitDecimal(BigNumber.from(value).toString())
    .div(UnitDecimal.pow(10, decimals))
    .toFixed();

  return formatted.includes(".") ? formatted : `${formatted}.0`;
}

export function parseEther(value: UnitValue) {
  return parseUnits(value, ETHER_DECIMALS);
}

export function formatEther(value: BigNumberish) {
  return formatUnits(value, ETHER_DECIMALS);
}

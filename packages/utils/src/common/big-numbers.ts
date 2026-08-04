import { BigNumber } from "@ethersproject/bignumber";

export function toReadableNumber(
  number: number | BigNumber | string | bigint,
  decimals: number = 18
) {
  return Number(number) / 10 ** decimals;
}

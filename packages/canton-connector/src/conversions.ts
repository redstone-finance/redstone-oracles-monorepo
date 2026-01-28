import { ContractParamsProvider } from "@redstone-finance/sdk";
import Decimal from "decimal.js";

export const REDSTONE_DECIMALS = 8;

export function convertDecimalValue(value: string) {
  const decimal = new Decimal(value).mul(10 ** REDSTONE_DECIMALS);

  return BigInt(decimal.toFixed());
}

export function getArrayifiedFeedId(feedId: string) {
  return ContractParamsProvider.arrayifyFeedId(ContractParamsProvider.hexlifyFeedId(feedId));
}

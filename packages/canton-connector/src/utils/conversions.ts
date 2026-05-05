import { ContractParamsProvider } from "@redstone-finance/sdk";
import Decimal from "decimal.js";

export type CantonFeedId = string[];

export const REDSTONE_DECIMALS = 8;

export function convertDecimalValue(value: string) {
  const decimal = new Decimal(value).mul(10 ** REDSTONE_DECIMALS);

  return BigInt(decimal.toFixed());
}

export function getCantonFeedId(feedId: string): CantonFeedId {
  return ContractParamsProvider.arrayifyFeedId(ContractParamsProvider.hexlifyFeedId(feedId)).map(
    String
  );
}

export function decodeCantonFeedId(feedId: CantonFeedId) {
  return ContractParamsProvider.unhexlifyFeedId(feedId.map(Number));
}

// CC has 10 decimal places; 1 CC = 10^10 normalized units
const CC_SCALE = 10 ** 10;

export function ccToNormalized(cc: string) {
  return BigInt(new Decimal(cc).mul(CC_SCALE).toFixed(0));
}

export function normalizedToCC(normalized: number) {
  return normalized / CC_SCALE;
}

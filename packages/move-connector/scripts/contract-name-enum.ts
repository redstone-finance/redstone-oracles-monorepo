import { z } from "zod";

export const PRICE_FEED_SUFFIX = "";

export const PRICE_ADAPTER = `price_adapter`;
export const REDSTONE_SDK = `redstone_sdk`;
export const PRICE_FEED = `price_feed${PRICE_FEED_SUFFIX}`;
export const ContractNameEnum = z.enum([
  REDSTONE_SDK,
  PRICE_ADAPTER,
  PRICE_FEED,
]);

export type ContractName = z.infer<typeof ContractNameEnum>;

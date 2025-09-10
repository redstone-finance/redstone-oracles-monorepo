import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";

export const PRICE_FEED_SUFFIX =
  RedstoneCommon.getFromEnv("PRICE_FEED_SUFFIX", z.string().optional()) ?? "";

export const PRICE_ADAPTER = `price_adapter`;
export const REDSTONE_SDK = `redstone_sdk`;
export const PRICE_FEED = `price_feed${PRICE_FEED_SUFFIX}`;
export const ContractNameEnum = z.enum([REDSTONE_SDK, PRICE_ADAPTER, PRICE_FEED]);

export type ContractName = z.infer<typeof ContractNameEnum>;

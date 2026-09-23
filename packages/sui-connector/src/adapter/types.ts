import { bcs } from "@mysten/sui/bcs";
import { z } from "zod";

const ConfigContent = z.object({
  signer_count_threshold: z.number(),
});

const PricesContent = z.object({
  id: z.string(),
});

export const PriceAdapterDataJsonContent = z.object({
  prices: PricesContent,
  config: ConfigContent,
});

const ConfigBcs = bcs.struct("Config", {
  signer_count_threshold: bcs.u8(),
  signers: bcs.vector(bcs.vector(bcs.u8())),
  max_timestamp_delay_ms: bcs.u64(),
  max_timestamp_ahead_ms: bcs.u64(),
  trusted_updaters: bcs.vector(bcs.Address),
  min_interval_between_updates_ms: bcs.u64(),
});

const TableBcs = bcs.struct("Table", {
  id: bcs.Address,
  size: bcs.u64(),
});

export const PriceAdapterDataContent = bcs.struct("PriceAdapter", {
  id: bcs.Address,
  prices: TableBcs,
  config: ConfigBcs,
  version: bcs.u8(),
});

export const PriceDataBcs = bcs.struct("PriceData", {
  feed_id: bcs.vector(bcs.u8()),
  value: bcs.u256(),
  timestamp: bcs.u64(),
  write_timestamp: bcs.u64(),
});

export type PriceData = typeof PriceDataBcs.$inferType;

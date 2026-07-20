import { z } from "zod";

export const NewestBlockTypeEnum = z.enum(["latest", "pending"]);
export type NewestBlockType = z.infer<typeof NewestBlockTypeEnum>;

export enum RewardsPerBlockAggregationAlgorithm {
  Max = "max",
  Median = "median",
}

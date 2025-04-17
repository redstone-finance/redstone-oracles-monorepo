import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

export const DEFAULT_AWS_REGION = "eu-west-1";

export const currentAwsRegion = (defaultRegion = DEFAULT_AWS_REGION) =>
  RedstoneCommon.getFromEnv("AWS_REGION", z.string().default(defaultRegion));

export const regionalCache = <T>(fun: (region: string) => T) => {
  const cache: Record<string, T> = {};
  return (region?: string) => {
    region ??= currentAwsRegion();
    if (!(region in cache)) {
      cache[region] = fun(region);
    }
    return cache[region];
  };
};

import { getEnvWithSSMParamFallback } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";

export async function getCantonAuth(chainId: number) {
  return await getEnvWithSSMParamFallback(
    `CANTON_${chainId}_AUTH`,
    RedstoneCommon.getFromEnv(`CANTON_${chainId}_AUTH_ARN_PATH`, z.string().optional()),
    true
  );
}

import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

interface SsmCacheEnvConfig {
  cacheSsmParameters: boolean;
  ssmCacheTime: number;
}

let ssmCacheEnv: SsmCacheEnvConfig | undefined;
const ssmCacheEnvConfig = () => {
  if (!ssmCacheEnv) {
    ssmCacheEnv = Object.freeze({
      cacheSsmParameters: RedstoneCommon.getFromEnv(
        "CACHE_SSM_PARAMETERS",
        z.boolean().default(false)
      ),
      ssmCacheTime: RedstoneCommon.getFromEnv(
        "SSM_CACHE_TIME",
        z.number().default(5 * 60 * 1000)
      ),
    });
  }

  return ssmCacheEnv;
};

interface CachedParameter {
  value: string;
  expiresAt: number;
}

const parameterCache: Partial<Record<string, CachedParameter>> = {};

export const saveToSsmCache = (
  parameterName: string,
  value: string | undefined,
  timeNow?: number
) => {
  const { cacheSsmParameters, ssmCacheTime } = ssmCacheEnvConfig();
  if (!cacheSsmParameters) {
    return;
  }

  if (value === undefined) {
    console.log(
      `Value provided for ${parameterName} is undefined, not saving to cache`
    );
    return;
  }

  const now = timeNow ?? Date.now();
  const expiresAt = now + ssmCacheTime;

  parameterCache[parameterName] = { value, expiresAt };
};

export const getFromSsmCache = (parameterName: string, timeNow?: number) => {
  const { cacheSsmParameters } = ssmCacheEnvConfig();
  if (!cacheSsmParameters) {
    return undefined;
  }

  const now = timeNow ?? Date.now();
  const cachedData = parameterCache[parameterName];

  if (cachedData === undefined || cachedData.expiresAt <= now) {
    return undefined;
  }

  return cachedData.value;
};

export const saveManyToSsmCache = (
  parameters: Record<string, string | undefined>,
  timeNow?: number
) => {
  const now = timeNow ?? Date.now();
  const names = Object.keys(parameters);
  for (const parameterName of names) {
    saveToSsmCache(parameterName, parameters[parameterName], now);
  }
};

export const getManyFromSsmCache = (parameters: string[], timeNow?: number) => {
  const result = {} as Record<string, string>;
  for (const parameterName of parameters) {
    const cached = getFromSsmCache(parameterName, timeNow);
    if (cached !== undefined) {
      result[parameterName] = cached;
    }
  }

  return result;
};

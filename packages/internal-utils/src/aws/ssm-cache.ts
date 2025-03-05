import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { AWS_REGION } from "./aws";

export interface CachedSSMParameter {
  value: string;
  expiresOn: number;
}

interface ParameterInfo {
  parameterName: string;
  region?: string;
}

// ToDo add env variables wherever needed
export const CACHE_SSM_PARAMETERS = RedstoneCommon.getFromEnv(
  "CACHE_SSM_PARAMETERS",
  z.boolean().default(false)
);

const SSM_CACHE_TTL_SECONDS = RedstoneCommon.getFromEnv(
  "SSM_CACHE_TTL_SECONDS",
  z.number().default(60 * 60)
);

const ssmCache: Record<string, CachedSSMParameter> = {};

const isExpired = (cachedParameter: CachedSSMParameter, timestamp?: number) => {
  const currentTime = timestamp ?? Date.now();
  return cachedParameter.expiresOn <= currentTime;
};

const getSSMCacheKey = (parameterInfo: ParameterInfo) => {
  const { parameterName, region } = parameterInfo;
  return `${parameterName}-${region ?? AWS_REGION}`;
};

export const getDataFromSSMCache = (
  parameterInfo: ParameterInfo
): CachedSSMParameter | undefined => {
  if (!CACHE_SSM_PARAMETERS) {
    console.log("Caching SSM parameters is not enabled");
    return undefined;
  }

  const key = getSSMCacheKey(parameterInfo);
  return ssmCache[key];
};

export const getNonExpiredDataFromSSMCache = (
  parameterInfo: ParameterInfo,
  currentTime?: number
): CachedSSMParameter | undefined => {
  const cachedData = getDataFromSSMCache(parameterInfo);

  if (cachedData && !isExpired(cachedData, currentTime)) {
    console.log(`Got cached data for ${parameterInfo.parameterName}`);
    return cachedData;
  }

  if (cachedData) {
    console.log(
      `Got cached data for ${parameterInfo.parameterName} but it expired, current time ${currentTime}, expired at ${cachedData.expiresOn}`
    );
  } else {
    console.log(`Did not get cached data for ${parameterInfo.parameterName}`);
  }

  return undefined;
};

export const saveDataInSSMCache = (
  parameterInfo: ParameterInfo,
  parameterValue: string | undefined,
  timestamp?: number
) => {
  if (!CACHE_SSM_PARAMETERS) {
    console.log("Caching SSM parameters is not enabled, not saving");
    return;
  }

  if (parameterValue === undefined) {
    console.log(
      `No parameter value provided for ${parameterInfo.parameterName}, not saving`
    );
    return;
  }

  const expiresOn = (timestamp ?? Date.now()) + SSM_CACHE_TTL_SECONDS * 1000;
  const key = getSSMCacheKey(parameterInfo);
  ssmCache[key] = {
    value: parameterValue,
    expiresOn,
  };
};

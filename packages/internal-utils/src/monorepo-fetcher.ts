import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

export const fetchFromMonorepo = async (filePath: string): Promise<string> => {
  const cloudfrontHostname = RedstoneCommon.getFromEnv("MONOREPO_HOSTNAME", z.string());

  const cloudFrontUrl = `https://${cloudfrontHostname}/redstone-finance/redstone-monorepo-priv/main/${filePath}`;

  const response = await fetch(cloudFrontUrl);

  if (!response.ok) {
    throw new Error(`Fetching from monorepo failed. Status: ${response.status}`);
  }

  const data = await response.text();

  return data;
};

export const fetchCacheWithAxios = async <T>(urls: string[], apikey?: string) => {
  for (const url of urls) {
    try {
      const response = await RedstoneCommon.axiosGetWithRetries<T>(url, {
        maxRetries: 2,
        headers: { apikey },
      });
      return response.data;
    } catch (e) {
      console.log(`Failed fetch from URL ${url}, error ${RedstoneCommon.stringifyError(e)}`);
    }
  }
  throw new Error(
    `failed to fetch from cache for ${JSON.stringify({ urls, hasApiKey: RedstoneCommon.isDefined(apikey) })}`
  );
};

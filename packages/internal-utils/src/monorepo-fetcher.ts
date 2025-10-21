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

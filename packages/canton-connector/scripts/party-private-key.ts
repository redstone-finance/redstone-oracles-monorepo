import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { readNetwork } from "./utils";

export async function readPartyPrivateKeyHex(partyHint: string): Promise<string> {
  const env = readNetwork() === "mainnet" ? "prod" : "dev";
  const ssmParamPath = RedstoneCommon.getFromEnv(
    "SSM_PARAM_PATH",
    z.string().default(`/${env}/canton/${partyHint}/private-key`)
  );
  const awsRegion = RedstoneCommon.getFromEnv("AWS_REGION", z.string().default("eu-west-1"));
  const privateKey = await getSSMParameterValue(ssmParamPath, awsRegion);

  if (!privateKey) {
    throw new Error(`Parameter ${ssmParamPath} not found in SSM`);
  }

  const normalized = privateKey.replace(/^0x/i, "").toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("Ed25519 private key must be a 32-byte hex string");
  }

  return normalized;
}

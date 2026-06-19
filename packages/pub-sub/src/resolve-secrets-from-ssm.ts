import { getSSMParameterValues } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { getReferencedSecretEnvPaths, PubSubSecrets } from "./MultiPubSubEnvConfigs";

export async function resolveSecretsFromSsm(configsEnvPath: string) {
  const ssmPathByEnvPath = getReferencedSecretEnvPaths(configsEnvPath)
    .filter(
      (envPath) =>
        !RedstoneCommon.isDefined(RedstoneCommon.getFromEnv(envPath, z.string().optional()))
    )
    .reduce((acc: Record<string, string>, envPath) => {
      const ssmPath = RedstoneCommon.getFromEnv(`${envPath}_SSM_PATH`, z.string().optional());
      if (RedstoneCommon.isDefined(ssmPath)) {
        acc[envPath] = ssmPath;
      }

      return acc;
    }, {});

  const values = await getSSMParameterValues(Object.values(ssmPathByEnvPath));

  return Object.entries(ssmPathByEnvPath).reduce((secrets: PubSubSecrets, [envPath, ssmPath]) => {
    const value = values[ssmPath];
    if (RedstoneCommon.isDefined(value)) {
      secrets[envPath] = value;
    }

    return secrets;
  }, {});
}

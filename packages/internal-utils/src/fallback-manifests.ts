import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { DynamoDbService } from "./aws/DynamoDbService";
import { sendMetrics } from "./aws/cloudwatch";
import { fetchCacheWithAxios } from "./monorepo-fetcher";

interface ManifestFallbackEntry<ManifestType> {
  type: ManifestType;
  hash: string;
}

enum _StateValues {
  "ALARM",
  "INSUFFICIENT_DATA",
  "OK",
}

export type StateValue = keyof typeof _StateValues;

const getCurrentManifestVersionWithAxios = async (apikey: string, hosts: string[]) => {
  if (hosts.length === 0) {
    console.error("No url specified for getting manifest version, skipping saving new fallback");
    return undefined;
  }

  const urls = hosts.map(
    (host) => `https://${host}/redstone-finance/redstone-monorepo-priv/main/manifest-version`
  );

  const result = await fetchCacheWithAxios<{ version: string }>(urls, apikey);

  return result.version;
};

const getCurrentManifestVersion = RedstoneCommon.memoize({
  functionToMemoize: getCurrentManifestVersionWithAxios,
  ttl: 60 * 1000,
});

export class ManifestFallbackService<ManifestType extends string> extends DynamoDbService {
  private cachedHashes: Partial<Record<ManifestType, string>> = {};

  private constructor(tableName: string) {
    super(tableName);
  }

  async getLatestWorkingManifestHash(type: ManifestType) {
    if (this.cachedHashes[type]) {
      console.log(`Using cached manifest hash for ${type} monitoring manifest`);
      return this.cachedHashes[type];
    }

    try {
      const item = await this.get<ManifestFallbackEntry<ManifestType>>({ type });
      if (!item) {
        console.warn(`Did not find a working manifest for type ${type} in table ${this.tableName}`);
        return undefined;
      }

      const { hash } = item;

      this.cachedHashes[type] = hash;
      return hash;
    } catch (e) {
      const errorMessage = `Error while getting manifest hash for type ${type} in table ${this.tableName}: ${RedstoneCommon.stringifyError(e)}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async saveManifestHash(type: ManifestType, manifestHash: string) {
    if (this.cachedHashes[type] === manifestHash) {
      console.log(`Already saved hash ${manifestHash} for ${type} manifest, skipping db call`);
      return;
    }

    await this.write({ type, hash: manifestHash });
    this.cachedHashes[type] = manifestHash;
  }

  async trySaveCurrentManifestHash(type: ManifestType, apiKey: string, hosts: string[]) {
    try {
      const manifestHash = await getCurrentManifestVersion(apiKey, hosts);
      if (!manifestHash) {
        console.error("Could not find current manifest hash in S3");
        return;
      }

      await this.saveManifestHash(type, manifestHash);
    } catch (e) {
      console.error(
        `Failed while trying to save current manifest hash to DynamoDb: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }

  static setupFallbackManifestDb<T extends string>(tableNameEnvVarName: string) {
    const tableName = RedstoneCommon.getFromEnv(tableNameEnvVarName, z.string().optional());
    if (tableName) {
      return new ManifestFallbackService<T>(tableName);
    }
    return undefined;
  }

  static async triggerFallbackManifestMetric(
    resourceNameEnvVarName: string,
    fallbackManifestMetricNameEnvVarName: string,
    fallbackManifestMetricNamespaceEnvVarName: string
  ) {
    const resourceName = RedstoneCommon.getFromEnv(resourceNameEnvVarName, z.string().optional());
    const fallbackManifestMetricName = RedstoneCommon.getFromEnv(
      fallbackManifestMetricNameEnvVarName,
      z.string().optional()
    );
    const fallbackManifestMetricNamespace = RedstoneCommon.getFromEnv(
      fallbackManifestMetricNamespaceEnvVarName,
      z.string().optional()
    );

    if (!resourceName || !fallbackManifestMetricNamespace || !fallbackManifestMetricName) {
      const errorMessage =
        "Tried to trigger fallback monitoring manifest metric, but metric data is not defined";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      await sendMetrics(fallbackManifestMetricNamespace, fallbackManifestMetricName, [
        {
          value: 1,
          dimensions: [
            {
              Name: "resourceName",
              Value: resourceName,
            },
          ],
        },
      ]);
    } catch (e) {
      console.error(
        `Tried to trigger fallback manifest metrics but got error: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
}

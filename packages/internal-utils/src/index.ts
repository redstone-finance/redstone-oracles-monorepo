import { RedstoneCommon } from "@redstone-finance/utils";

export * from "./ApiKeysUsageTracker";
export * from "./aws/cloudwatch";
export * from "./aws/DynamoDbService";
export * from "./aws/ecs";
export * from "./aws/lambda";
export * from "./aws/params";
export * from "./aws/PubSubArchiverDataPackageDynamoDb";
export * from "./aws/region";
export * from "./aws/s3";
export * from "./config-checks";
export * from "./crypto";
export * from "./fallback-manifests";
export * from "./hash-utils";
export * from "./influx/influxdb-config";
export * from "./influx/InfluxService";
export * from "./json-utils";
export * from "./large-env-utils";
export * from "./LogMonitoring";
export * from "./manifests";
export * from "./monorepo-fetcher";
export * from "./outlier-detection";
export * from "./resolve-manifest-with-expiration-updates";
export * from "./SerializerDeserializer";
export * from "./signer-addresses-fetcher";
export * from "./TelemetrySendService";
export * from "./Terminator";
export * from "./timestamp-utils";

const assertMinVersion = (actualVersion: string, minimumVersion: string, context = "") => {
  const actualVersionComponents = actualVersion.split(".").map(Number);
  const minimumVersionComponents = minimumVersion.split(".").map(Number);
  const componentsCount = Math.min(actualVersionComponents.length, minimumVersionComponents.length);
  for (let i = 0; i < componentsCount; ++i) {
    if (actualVersionComponents[i] > minimumVersionComponents[i]) {
      return;
    }
    if (actualVersionComponents[i] < minimumVersionComponents[i]) {
      throw new Error(
        `${context} version ${actualVersion} does not satisfy minimum version requirement ${minimumVersion}`
      );
    }
  }
};

const MINIMAL_NODE_VERSION_REQUIRED = "22";
const nodeVersion = RedstoneCommon.getNodeVersion();
if (RedstoneCommon.isDefined(nodeVersion)) {
  assertMinVersion(nodeVersion, MINIMAL_NODE_VERSION_REQUIRED, "Node");
}

const MINIMAL_DENO_VERSION_REQUIRED = "1.42";
const denoVersion = RedstoneCommon.getDenoVersion();
if (RedstoneCommon.isDefined(denoVersion)) {
  assertMinVersion(denoVersion, MINIMAL_DENO_VERSION_REQUIRED, "Deno");
}

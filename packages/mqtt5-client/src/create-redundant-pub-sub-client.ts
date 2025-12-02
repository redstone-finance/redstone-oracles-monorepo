import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { MultiPubSubClient } from "./MultiPubSubClient";
import { createMqtt5ClientFactory, PubSubClientFactory } from "./PubSubClientFactory";
import { RedundantPubSubClient, RedundantPubSubConfig } from "./RedundantPubSubClient";
import { RedundantPubSubEnvConfig, RedundantPubSubEnvConfigs } from "./RedundantPubSubEnvConfig";
import { PollingHttpClient, SSEPubSubClient } from "./light-gateway-clients";

const logger = loggerFactory("create-redundant-pub-sub-client");

type MqttConfig = Extract<
  z.infer<typeof RedundantPubSubEnvConfig>,
  { type: "mqttAWSV4Sig" | "mqttCert" | "mqttUnauthenticated" }
>;

export function createRedundantPubSubClientFromEnv(
  envPath = "PUB_SUB_CONFIGS"
): RedundantPubSubClient | undefined {
  const configs = RedstoneCommon.getFromEnv(envPath, RedundantPubSubEnvConfigs.optional());
  if (!configs) {
    return undefined;
  }

  return createRedundantPubSubClient(configs);
}

export function createRedundantPubSubClient(configs: z.infer<typeof RedundantPubSubEnvConfigs>) {
  const redundantPubSubConfigs: RedundantPubSubConfig[] = configs.map((config) => {
    logger.info("Creating PubSubClient for RedundantPubSubClient", { config });

    const client = resolvePubSubClient(config);

    return {
      client,
      name: `${config.type}::${config.host}`,
    };
  });

  return new RedundantPubSubClient(redundantPubSubConfigs);
}

function resolvePubSubClient(config: z.infer<typeof RedundantPubSubEnvConfig>) {
  switch (config.type) {
    case "sse":
      return new SSEPubSubClient(config.host);

    case "polling":
      return new PollingHttpClient(config.host, config.pollingIntervalMs);

    case "mqttAWSV4Sig":
    case "mqttCert":
    case "mqttUnauthenticated":
      return new MultiPubSubClient(
        resolveMqttClientFactory(config),
        config.expectedRequestPerSecondPerTopic,
        config.host
      );

    default:
      return RedstoneCommon.throwUnsupportedParamError(config);
  }
}

function resolveMqttClientFactory(config: MqttConfig): PubSubClientFactory {
  const configType = config.type;
  switch (configType) {
    case "mqttAWSV4Sig": {
      return createMqtt5ClientFactory({
        authorization: { type: "AWSSigV4" },
        endpoint: config.host,
      });
    }

    case "mqttCert": {
      return createMqtt5ClientFactory({
        authorization: {
          type: "Cert",
          privateKey: RedstoneCommon.getFromEnv(config.privateKeyEnvPath),
          cert: RedstoneCommon.getFromEnv(config.certEnvPath),
        },
        endpoint: config.host,
      });
    }

    case "mqttUnauthenticated": {
      return createMqtt5ClientFactory({
        authorization: {
          type: "Unauthenticated",
          port: config.port,
        },
        endpoint: config.host,
      });
    }

    default:
      return RedstoneCommon.throwUnsupportedParamError(configType);
  }
}

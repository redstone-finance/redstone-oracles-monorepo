import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { MultiPubSubClient, MultiPubSubConfig } from "./MultiPubSubClient";
import { MultiPubSubEnvConfig, MultiPubSubEnvConfigs } from "./MultiPubSubEnvConfigs";
import { PooledMqttClient } from "./PooledMqttClient";
import { createMqtt5ClientFactory, PubSubClientFactory } from "./PubSubClientFactory";
import { PollingHttpClient, SSEPubSubClient } from "./light-gateway-clients";

const logger = loggerFactory("create-multi-pub-sub-client");

type MqttConfig = Extract<
  z.infer<typeof MultiPubSubEnvConfig>,
  { type: "mqttAWSV4Sig" | "mqttCert" | "mqttUnauthenticated" }
>;

export function createMultiPubSubClientFromEnv(
  envPath = "PUB_SUB_CONFIGS"
): MultiPubSubClient | undefined {
  const configs = RedstoneCommon.getFromEnv(envPath, MultiPubSubEnvConfigs.optional());
  if (!configs) {
    return undefined;
  }

  return createMultiPubSubClient(configs);
}

export function createMultiPubSubClient(configs: z.infer<typeof MultiPubSubEnvConfigs>) {
  const multiPubSubConfigs: MultiPubSubConfig[] = configs.map((config) => {
    logger.info("Creating PubSubClient for MultiPubSubClient", { config });

    const client = resolvePubSubClient(config);

    return {
      client,
      name: `${config.type}::${config.host}`,
    };
  });

  return new MultiPubSubClient(multiPubSubConfigs);
}

export function resolvePubSubClient(config: z.infer<typeof MultiPubSubEnvConfig>) {
  switch (config.type) {
    case "sse":
      return new SSEPubSubClient(config.host);

    case "polling":
      return new PollingHttpClient(config.host, config.pollingIntervalMs);

    case "mqttAWSV4Sig":
    case "mqttCert":
    case "mqttUnauthenticated":
      return new PooledMqttClient(
        resolveMqttClientFactory(config),
        config.expectedRequestPerSecondPerTopic,
        config.host,
        config.nodeAddresses
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

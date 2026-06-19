import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { PollingHttpClient, SSEPubSubClient } from "./light-gateway-clients";
import { MultiPubSubClient, MultiPubSubConfig } from "./MultiPubSubClient";
import {
  createMultiPubSubEnvConfigs,
  MultiPubSubEnvConfig,
  MultiPubSubEnvConfigs,
  PubSubSecrets,
} from "./MultiPubSubEnvConfigs";
import { NatsClient } from "./NatsClient";
import { PooledMqttClient } from "./PooledMqttClient";
import { PubSubClient } from "./PubSubClient";
import { createMqtt5ClientFactory, PubSubClientFactory } from "./PubSubClientFactory";
import { resolveSecretsFromSsm } from "./resolve-secrets-from-ssm";

const logger = loggerFactory("create-multi-pub-sub-client");

type MqttConfig = Extract<
  z.infer<typeof MultiPubSubEnvConfig>,
  { type: "mqttAWSV4Sig" | "mqttCert" | "mqttUnauthenticated" }
>;

export function createMultiPubSubClientFromEnv(envPath = "PUB_SUB_CONFIGS") {
  const configs = RedstoneCommon.getFromEnv(envPath, MultiPubSubEnvConfigs.optional());
  if (!configs?.length) {
    return undefined;
  }

  return createMultiPubSubClient(configs);
}

export async function createMultiPubSubClientFromEnvWithSsm(envPath = "PUB_SUB_CONFIGS") {
  const secrets = await resolveSecretsFromSsm(envPath);
  const configs = RedstoneCommon.getFromEnv(
    envPath,
    createMultiPubSubEnvConfigs(secrets).optional()
  );
  if (!configs?.length) {
    return undefined;
  }

  return createMultiPubSubClient(configs, secrets);
}

export function createMultiPubSubClient(
  configs: z.infer<typeof MultiPubSubEnvConfigs>,
  secrets?: PubSubSecrets
) {
  const multiPubSubConfigs: MultiPubSubConfig[] = configs.map((config) => {
    logger.info("Creating PubSubClient for MultiPubSubClient", { config });

    const client = resolvePubSubClient(config, secrets);

    return {
      client,
      name: `${config.type}::${config.host}`,
    };
  });

  return new MultiPubSubClient(multiPubSubConfigs);
}

export function resolvePubSubClient(
  config: z.infer<typeof MultiPubSubEnvConfig>,
  secrets?: PubSubSecrets
): PubSubClient {
  switch (config.type) {
    case "sse":
      return new SSEPubSubClient(config.host);

    case "polling":
      return new PollingHttpClient(config.host, config.pollingIntervalMs);

    case "nats":
      return new NatsClient({
        host: config.host,
        connectionTimeoutMs: config.connectionTimeoutMs,
        reconnectBaseDelayMs: config.reconnectBaseDelayMs,
        reconnectMaxDelayMs: config.reconnectMaxDelayMs,
        nkeySeed: config.nkeySeedEnvPath
          ? readEnvValue(config.nkeySeedEnvPath, secrets)
          : undefined,
        caCert: readEnvCert(config.caCertEnvPath, secrets),
        clientCert: readEnvCert(config.clientCertEnvPath, secrets),
        clientKey: readEnvCert(config.clientKeyEnvPath, secrets),
      });

    case "mqttAWSV4Sig":
    case "mqttCert":
    case "mqttUnauthenticated":
      return new PooledMqttClient(
        resolveMqttClientFactory(config, secrets),
        config.topicCountPerConnection,
        config.host
      );

    default:
      return RedstoneCommon.throwUnsupportedParamError(config);
  }
}

function resolveMqttClientFactory(
  config: MqttConfig,
  secrets?: PubSubSecrets
): PubSubClientFactory {
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
          privateKey: readEnvValue(config.privateKeyEnvPath, secrets),
          cert: readEnvValue(config.certEnvPath, secrets),
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

function readEnvValue(envPath: string, secrets?: PubSubSecrets) {
  return secrets?.[envPath] ?? RedstoneCommon.getFromEnv(envPath);
}

function readEnvCert(envPath?: string, secrets?: PubSubSecrets) {
  if (!envPath) {
    return;
  }

  const value = readEnvValue(envPath, secrets);
  const LINE_SEP = "\n";

  return value
    .split(LINE_SEP)
    .map((line) => line.trim())
    .join(LINE_SEP);
}

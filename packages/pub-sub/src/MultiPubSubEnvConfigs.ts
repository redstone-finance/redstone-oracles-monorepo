import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { calculateTopicCountPerConnection } from "./topics";

export type PubSubSecrets = Record<string, string>;

export const MqttPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  topicCountPerConnection: z.number().default(calculateTopicCountPerConnection()),
});

const MqttV4Sig = MqttPubSubEnvConfigBase.extend({
  type: z.enum(["mqttAWSV4Sig"]),
});

const MqttUnauthenticated = MqttPubSubEnvConfigBase.extend({
  type: z.enum(["mqttUnauthenticated"]),
  host: z.string().default("localhost"),
  port: z.number().default(1883),
});

const SSE = z.object({
  host: z.string(),
  type: z.enum(["sse"]),
});

const Polling = z.object({
  host: z.string(),
  type: z.enum(["polling"]),
  pollingIntervalMs: z.number().optional(),
});

export const MultiPubSubEnvConfig = createMultiPubSubEnvConfig();
export const MultiPubSubEnvConfigs = createMultiPubSubEnvConfigs();

export function createMultiPubSubEnvConfig(secrets?: PubSubSecrets) {
  return buildMultiPubSubEnvConfig(isSecretSomewhereAvailable(secrets));
}

export function createMultiPubSubEnvConfigs(secrets?: PubSubSecrets) {
  return createMultiPubSubEnvConfig(secrets).array();
}

export function getReferencedSecretEnvPaths(envPath = "PUB_SUB_CONFIGS") {
  const configs = RedstoneCommon.getFromEnv(
    envPath,
    buildMultiPubSubEnvConfig().array().optional()
  );

  if (!RedstoneCommon.isDefined(configs)) {
    return [];
  }

  const referenced = configs.flatMap((config) =>
    Object.entries(config)
      .filter(
        (entry): entry is [string, string] =>
          entry[0].endsWith("EnvPath") && typeof entry[1] === "string"
      )
      .map(([, envPathName]) => envPathName)
  );

  return [...new Set(referenced)];
}

function buildMultiPubSubEnvConfig(isAvailable = (_path: string) => true) {
  const requiredEnvPath = (label: string) =>
    z.string().superRefine((path, ctx) => {
      if (!isAvailable(path)) {
        ctx.addIssue(`Expected ENV ${path} ${label}`);
      }
    });

  const optionalEnvPath = (label: string) =>
    z
      .string()
      .optional()
      .superRefine((path, ctx) => {
        if (RedstoneCommon.isDefined(path) && !isAvailable(path)) {
          ctx.addIssue(`Expected ENV ${path} ${label}`);
        }
      });

  const MqttCert = MqttPubSubEnvConfigBase.extend({
    type: z.enum(["mqttCert"]),
    privateKeyEnvPath: requiredEnvPath("by mqtt cert authorization - privateKeyEnvPath"),
    certEnvPath: requiredEnvPath("by mqtt cert authorization - certEnvPath"),
  });

  const NatsConfig = z.object({
    type: z.enum(["nats"]),
    host: z.string(),
    connectionTimeoutMs: z.number().optional(),
    reconnectBaseDelayMs: z.number().optional(),
    reconnectMaxDelayMs: z.number().optional(),
    nkeySeedEnvPath: optionalEnvPath("by nats nkey authentication - nkeySeedEnvPath"),
    caCertEnvPath: optionalEnvPath("by nats TLS - caCertEnvPath"),
    clientCertEnvPath: optionalEnvPath("by nats mTLS - clientCertEnvPath"),
    clientKeyEnvPath: optionalEnvPath("by nats mTLS - clientKeyEnvPath"),
  });

  return z.discriminatedUnion("type", [
    MqttV4Sig,
    MqttCert,
    MqttUnauthenticated,
    SSE,
    Polling,
    NatsConfig,
  ]);
}

function isSecretSomewhereAvailable(secrets?: PubSubSecrets) {
  return (path: string) =>
    RedstoneCommon.isDefined(secrets?.[path]) ||
    RedstoneCommon.isDefined(RedstoneCommon.getFromEnv(path, z.string().optional()));
}

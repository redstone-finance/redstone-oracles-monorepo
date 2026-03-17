import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { calculateTopicCountPerConnection } from "./topics";

export const MqttPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  topicCountPerConnection: z.number().default(calculateTopicCountPerConnection()),
});

const MqttV4Sig = MqttPubSubEnvConfigBase.extend({
  type: z.enum(["mqttAWSV4Sig"]),
});

const MqttCert = MqttPubSubEnvConfigBase.extend({
  type: z.enum(["mqttCert"]),
  privateKeyEnvPath: z.string().superRefine((path, ctx) => {
    if (!RedstoneCommon.isDefined(process.env[path])) {
      ctx.addIssue(`Expected ENV ${path} by mqtt cert authorization - privateKeyEnvPath`);
    }
  }),
  certEnvPath: z.string().superRefine((path, ctx) => {
    if (!RedstoneCommon.isDefined(process.env[path])) {
      ctx.addIssue(`Expected ENV ${path} by mqtt cert authorization - certEnvPath`);
    }
  }),
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

const NatsConfig = z.object({
  type: z.enum(["nats"]),
  host: z.string(),
  connectionTimeoutMs: z.number().optional(),
  nkeySeedEnvPath: z
    .string()
    .optional()
    .superRefine((path, ctx) => {
      if (path !== undefined && !RedstoneCommon.isDefined(process.env[path])) {
        ctx.addIssue(`Expected ENV ${path} by nats nkey authentication - nkeySeedEnvPath`);
      }
    }),
  caCertEnvPath: z
    .string()
    .optional()
    .superRefine((path, ctx) => {
      if (path !== undefined && !RedstoneCommon.isDefined(process.env[path])) {
        ctx.addIssue(`Expected ENV ${path} by nats TLS - caCertEnvPath`);
      }
    }),
  clientCertEnvPath: z
    .string()
    .optional()
    .superRefine((path, ctx) => {
      if (path !== undefined && !RedstoneCommon.isDefined(process.env[path])) {
        ctx.addIssue(`Expected ENV ${path} by nats mTLS - clientCertEnvPath`);
      }
    }),
  clientKeyEnvPath: z
    .string()
    .optional()
    .superRefine((path, ctx) => {
      if (path !== undefined && !RedstoneCommon.isDefined(process.env[path])) {
        ctx.addIssue(`Expected ENV ${path} by nats mTLS - clientKeyEnvPath`);
      }
    }),
});

export const MultiPubSubEnvConfig = z.discriminatedUnion("type", [
  MqttV4Sig,
  MqttCert,
  MqttUnauthenticated,
  SSE,
  Polling,
  NatsConfig,
]);
export const MultiPubSubEnvConfigs = MultiPubSubEnvConfig.array().min(1);

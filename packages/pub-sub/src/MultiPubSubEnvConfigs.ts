import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { calculateTopicCountPerConnection } from "./topics";

export const MqttPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  expectedRequestPerSecondPerTopic: z.number().default(calculateTopicCountPerConnection()),
  // When defined, only topics containing any of these node addresses will be subscribed.
  // When undefined, all topics are subscribed (no filtering).
  nodeAddresses: z.string().array().optional(),
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

export const MultiPubSubEnvConfig = z.discriminatedUnion("type", [
  MqttV4Sig,
  MqttCert,
  MqttUnauthenticated,
  SSE,
  Polling,
]);
export const MultiPubSubEnvConfigs = MultiPubSubEnvConfig.array().min(1);

import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { calculateTopicCountPerConnection } from "./topics";

export const MultiPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  expectedRequestPerSecondPerTopic: z.number().default(calculateTopicCountPerConnection()),
});

const MqttV4Sig = MultiPubSubEnvConfigBase.extend({
  type: z.enum(["mqttAWSV4Sig"]),
  // When defined, only topics containing any of these node addresses will be subscribed.
  // When undefined, all topics are subscribed (no filtering).
  nodeAddresses: z.string().array().optional(),
});

const MqttCert = MultiPubSubEnvConfigBase.extend({
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
  // When defined, only topics containing any of these node addresses will be subscribed.
  // When undefined, all topics are subscribed (no filtering).
  nodeAddresses: z.string().array().optional(),
});

const MqttUnauthenticated = MultiPubSubEnvConfigBase.extend({
  type: z.enum(["mqttUnauthenticated"]),
  host: z.string().default("localhost"),
  port: z.number().default(1883),
  // When defined, only topics containing any of these node addresses will be subscribed.
  // When undefined, all topics are subscribed (no filtering).
  nodeAddresses: z.string().array().optional(),
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

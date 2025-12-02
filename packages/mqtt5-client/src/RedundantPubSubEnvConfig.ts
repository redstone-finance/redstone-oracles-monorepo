import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { calculateTopicCountPerConnection } from "./topics";

export const RedundantPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  expectedRequestPerSecondPerTopic: z.number().default(calculateTopicCountPerConnection()),
});

const MqttV4Sig = RedundantPubSubEnvConfigBase.extend({
  type: z.enum(["mqttAWSV4Sig"]),
});

const MqttCert = RedundantPubSubEnvConfigBase.extend({
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

const MqttUnauthenticated = RedundantPubSubEnvConfigBase.extend({
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

export const RedundantPubSubEnvConfig = z.discriminatedUnion("type", [
  MqttV4Sig,
  MqttCert,
  MqttUnauthenticated,
  SSE,
  Polling,
]);
export const RedundantPubSubEnvConfigs = RedundantPubSubEnvConfig.array().min(1);

import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

export const RedundantPubSubEnvConfigBase = z.object({
  host: z.string(),
  // important only in the context of reader
  expectedRequestPerSecondPerTopic: z.number(),
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

const SSE = RedundantPubSubEnvConfigBase.extend({
  type: z.enum(["sse"]),
});

export const RedundantPubSubEnvConfig = z.discriminatedUnion("type", [MqttV4Sig, MqttCert, SSE]);
export const RedundantPubSubEnvConfigs = RedundantPubSubEnvConfig.array().min(1);

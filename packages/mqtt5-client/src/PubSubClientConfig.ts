import { RedstoneCommon } from "@redstone-finance/utils";
import { mqtt, mqtt5 } from "aws-iot-device-sdk-v2";

export type PubSubClientConfig = {
  endpoint: string;
  authorization: { type: "AWSSigV4" } | { type: "Cert"; privateKey: string; cert: string };
  qos?: mqtt5.QoS;
  connectionTimeoutMs?: number;
  messageExpireTimeMs?: number;
};

export const DEFAULT_CONFIG = {
  qos: mqtt.QoS.AtMostOnce,
  connectionTimeoutMs: 10_000,
  messageExpireTimeMs: RedstoneCommon.minToMs(60),
};

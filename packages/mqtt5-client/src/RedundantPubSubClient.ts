import { ContentTypes } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { createMqtt5ClientFactory } from "./Mqtt5Client";
import { MultiPubSubClient } from "./MultiPubSubClient";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";

export type RedundantPubSubConfig = {
  client: PubSubClient;
  name: string;
};

const MqttV4Sig = z.object({
  type: z.enum(["mqttAWSV4Sig"]),
  host: z.string(),
  // important only in context of reader
  expectedRequestPerSecondPerTopic: z.number(),
});

const MqttCert = z.object({
  type: z.enum(["mqttCert"]),
  host: z.string(),
  // important only in context of reader
  expectedRequestPerSecondPerTopic: z.number(),
  privateKeyEnvPath: z.string().refine(
    (path) => RedstoneCommon.isDefined(process.env[path]),
    (path) => ({ message: `Expected ENV ${path} by mqtt cert authorization - privateKeyEnvPath` })
  ),
  certEnvPath: z.string().refine(
    (path) => RedstoneCommon.isDefined(process.env[path]),
    (path) => ({ message: `Expected ENV ${path} by mqtt cert authorization - certEnvPath` })
  ),
});

const RedundantMqttEnvConfig = z.discriminatedUnion("type", [MqttV4Sig, MqttCert]).array().min(1);

export function createRedundantPubSubClientFromEnv(
  envPath = "PUB_SUB_CONFIGS"
): RedundantPubSubClient | undefined {
  const configs = RedstoneCommon.getFromEnv(envPath, RedundantMqttEnvConfig.optional());
  if (!configs) {
    return undefined;
  }
  const redundantPubSubConfig: RedundantPubSubConfig[] = [];

  for (const config of configs) {
    const type = config.type;
    switch (type) {
      case "mqttAWSV4Sig": {
        const client = new MultiPubSubClient(
          createMqtt5ClientFactory({
            authorization: { type: "AWSSigV4" },
            endpoint: config.host,
          }),
          config.expectedRequestPerSecondPerTopic,
          config.host
        );

        redundantPubSubConfig.push({
          client,
          name: `${config.type}::${config.host}`,
        });

        break;
      }

      case "mqttCert": {
        const client = new MultiPubSubClient(
          createMqtt5ClientFactory({
            authorization: {
              type: "Cert",
              privateKey: RedstoneCommon.getFromEnv(config.privateKeyEnvPath),
              cert: RedstoneCommon.getFromEnv(config.certEnvPath),
            },
            endpoint: config.host,
          }),
          config.expectedRequestPerSecondPerTopic,
          config.host
        );
        redundantPubSubConfig.push({ client, name: `${config.type}::${config.host}` });
        break;
      }
      default:
        return RedstoneCommon.throwUnsupportedParamError(type);
    }
  }

  return new RedundantPubSubClient(redundantPubSubConfig);
}

export class RedundantPubSubClient implements PubSubClient {
  logger = loggerFactory("redundant-pub-sub-client");
  private readonly uniqueName: string;

  constructor(private readonly pubSubConfigs: RedundantPubSubConfig[]) {
    RedstoneCommon.assert(
      pubSubConfigs.length > 0,
      `RedundantPubSubClient requires at least one client`
    );
    this.uniqueName = this.pubSubConfigs.map((x) => x.name).join("#");
  }

  getUniqueName(): string {
    return this.uniqueName;
  }

  /** Publish data to all channels, fails only if all clients fail */
  async publish(payloads: PubSubPayload[], contentType: ContentTypes): Promise<void> {
    const results = await Promise.allSettled(
      this.pubSubConfigs.map((config) => config.client.publish(payloads, contentType))
    );

    if (results.some((r) => r.status === "fulfilled")) {
      return;
    }

    throw new AggregateError(
      results
        .filter((r) => r.status === "rejected")
        .map((r) => RedstoneCommon.stringifyError(r.reason)),
      `All pubSub clients failed to publish data`
    );
  }

  /** Receive data from multiple channels thus expect duplicates, fails only if all clients fail */
  async subscribe(topics: string[], onMessage: SubscribeCallback): Promise<void> {
    const results = await Promise.allSettled(
      this.pubSubConfigs.map((config) => config.client.subscribe(topics, onMessage))
    );

    if (results.some((r) => r.status === "fulfilled")) {
      return;
    }

    throw new AggregateError(
      results
        .filter((r) => r.status === "rejected")
        .map((r) => RedstoneCommon.stringifyError(r.reason)),
      `All pubSub clients failed to subscribe to data`
    );
  }

  /** Fails if any of pubsubclient fail **/
  async unsubscribe(topics: string[]): Promise<void> {
    await Promise.all(this.pubSubConfigs.map((config) => config.client.unsubscribe(topics)));
  }

  stop(): void {
    this.pubSubConfigs.forEach((config) => config.client.stop());
  }
}

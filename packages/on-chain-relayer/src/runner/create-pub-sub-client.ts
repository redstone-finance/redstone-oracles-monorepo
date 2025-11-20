import {
  createMqtt5ClientFactory,
  createRedundantPubSubClientFromEnv,
  MqttTopics,
  MultiPubSubClient,
  PubSubClient,
} from "@redstone-finance/mqtt5-client";
import { RelayerConfig } from "../config/RelayerConfig";

const MQTT_PUB_SUB_CONFIGS_ENV_PATH = "MQTT_PUB_SUB_CONFIGS";

export function createPubSubClient(relayerConfig: RelayerConfig): PubSubClient {
  const client = createRedundantPubSubClientFromEnv(MQTT_PUB_SUB_CONFIGS_ENV_PATH);
  if (client) {
    return client;
  }

  // Fallback to the previous method
  if (!relayerConfig.mqttEndpoint) {
    throw new Error(
      `Relayer is going to run with mqtt but no mqttEndpoint (${relayerConfig.mqttEndpoint}) ` +
        `or not at least one value in ${MQTT_PUB_SUB_CONFIGS_ENV_PATH} are set`
    );
  }

  return new MultiPubSubClient(
    createMqtt5ClientFactory({
      endpoint: relayerConfig.mqttEndpoint,
      authorization: {
        type: "AWSSigV4",
      },
    }),
    MqttTopics.calculateTopicCountPerConnection(),
    relayerConfig.mqttEndpoint
  );
}

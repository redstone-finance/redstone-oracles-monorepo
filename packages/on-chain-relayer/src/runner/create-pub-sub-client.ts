import {
  createMqtt5ClientFactory,
  createMultiPubSubClientFromEnv,
  MqttTopics,
  PooledMqttClient,
  PubSubClient,
} from "@redstone-finance/pub-sub";
import { RelayerConfig } from "../config/RelayerConfig";

const MQTT_PUB_SUB_CONFIGS_ENV_PATH = "MQTT_PUB_SUB_CONFIGS";

export function createPubSubClient(relayerConfig: RelayerConfig): PubSubClient {
  const client = createMultiPubSubClientFromEnv(MQTT_PUB_SUB_CONFIGS_ENV_PATH);
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

  return new PooledMqttClient(
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

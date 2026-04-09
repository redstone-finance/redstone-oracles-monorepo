import {
  createMqtt5ClientFactory,
  createMultiPubSubClientFromEnv,
  MqttTopics,
  PooledMqttClient,
  PubSubClient,
} from "@redstone-finance/pub-sub";
import { RelayerConfig } from "../config/RelayerConfig";

const PUB_SUB_CONFIGS_ENV_PATH = "PUB_SUB_CONFIGS";

export function createPubSubClient(relayerConfig: RelayerConfig): PubSubClient {
  const client = createMultiPubSubClientFromEnv(PUB_SUB_CONFIGS_ENV_PATH);
  if (client) {
    return client;
  }

  // Fallback to the previous method
  if (!relayerConfig.pubSubEndpoint) {
    throw new Error(
      `Relayer is going to run with pub-sub but no pubSubEndpoint (${relayerConfig.pubSubEndpoint}) ` +
        `or not at least one value in ${PUB_SUB_CONFIGS_ENV_PATH} are set`
    );
  }

  return new PooledMqttClient(
    createMqtt5ClientFactory({
      endpoint: relayerConfig.pubSubEndpoint,
      authorization: {
        type: "AWSSigV4",
      },
    }),
    MqttTopics.calculateTopicCountPerConnection(),
    relayerConfig.pubSubEndpoint
  );
}

import { Mqtt5Client } from "./Mqtt5Client";
import { PubSubClient } from "./PubSubClient";
import { MqttPubSubClientConfig, SSEPubSubClientConfig } from "./PubSubClientConfig";
import { SSEPubSubClient } from "./light-gateway-clients/SSEPubSubClient";

export type PubSubClientFactory = () => Promise<PubSubClient>;

export const createMqtt5ClientFactory =
  (config: MqttPubSubClientConfig): PubSubClientFactory =>
  () =>
    Mqtt5Client.create(config);

export const createSSEClientFactory =
  (config: SSEPubSubClientConfig): PubSubClientFactory =>
  () =>
    Promise.resolve(new SSEPubSubClient(config.endpoint));

import { Mqtt5Client } from "./Mqtt5Client";
import { PubSubClient } from "./PubSubClient";
import { MqttPubSubClientConfig } from "./PubSubClientConfig";

export type PubSubClientFactory = () => Promise<PubSubClient>;

export const createMqtt5ClientFactory =
  (config: MqttPubSubClientConfig): PubSubClientFactory =>
  () =>
    Mqtt5Client.create(config);

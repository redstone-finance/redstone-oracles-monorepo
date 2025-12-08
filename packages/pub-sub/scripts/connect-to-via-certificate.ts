import "dotenv/config";

import { Mqtt5Client, PubSubClient } from "../src";

const CERT = process.env.MQTT_CERT!;
const PRIVATE_KEY = process.env.MQTT_PRIVATE_KEY!;
const ENDPOINT = process.env.MQTT_ENDPOINT!;
const TOPIC = process.env.MQTT_TOPIC || "#";

async function main() {
  const mqttClient = await Mqtt5Client.create({
    endpoint: ENDPOINT,
    authorization: {
      type: "Cert",
      privateKey: PRIVATE_KEY,
      cert: CERT,
    },
  });

  await mqttClient.subscribe(
    [TOPIC],
    (topicName: string, messagePayload: unknown, error: string | null, _client: PubSubClient) => {
      console.dir({ topicName, payload: messagePayload, error }, { depth: null });
    }
  );
}

void main();

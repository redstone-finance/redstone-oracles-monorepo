import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { PollingHttpClient, SSEPubSubClient } from "../src";

const GATEWAY_URL = "http://localhost:3000";
const NUM_PUBLISHERS = 5;
const NUM_SUBSCRIBERS = 10;
const TOPICS_PER_SUBSCRIBER = 20;
const PUBLISH_INTERVAL_MS = 100;
const SUBSCRIPTION_ROTATION_MS = 5000;

const clientToUse = RedstoneCommon.getFromEnv("USE_POLLING", z.boolean().default(false))
  ? PollingHttpClient
  : SSEPubSubClient;

type Package = {
  timestamp: number;
  publisherId: string;
  value: number;
};

const generateTopics = (count: number, id: number, prefix: string) =>
  Array.from({ length: count }, (_, i) => `${prefix}_${id * count + i}`);

const createPublisher = (id: number) => {
  const topics = generateTopics(10, id, `topic`);

  const publish = async () => {
    const client = new clientToUse(GATEWAY_URL);

    for (;;) {
      const payloads = topics.map((topic) => ({
        topic,
        data: {
          timestamp: Date.now(),
          publisherId: id,
          value: Math.random() * 1000,
        },
      }));

      try {
        await client.publish(payloads);
      } catch (e) {
        console.error(`Failed to publish package`, e);
      }
      await new Promise((resolve) => setTimeout(resolve, PUBLISH_INTERVAL_MS));
    }
  };

  return publish();
};

const createSubscriber = async (id: number) => {
  const allTopics = generateTopics(50, 0, "topic");
  const client = new clientToUse(GATEWAY_URL);
  const messageCount = new Map<string, number>();

  let currentOffset = id * TOPICS_PER_SUBSCRIBER;

  const callback = (topic: string, data: unknown) => {
    const count = messageCount.get(topic) || 0;
    messageCount.set(topic, count + 1);

    if (count % 10 === 0) {
      const decoded = data as Package;
      console.log(`${Date.now().toLocaleString()} Subscriber ${id} - ${topic}:`, {
        count,
        latency: Date.now() - decoded.timestamp,
        value: decoded.value.toFixed(2),
      });
    }
  };

  const rotateSubscriptions = async () => {
    const oldTopics = allTopics.slice(currentOffset, currentOffset + TOPICS_PER_SUBSCRIBER);

    currentOffset = (currentOffset + TOPICS_PER_SUBSCRIBER) % allTopics.length;

    const newTopics = allTopics.slice(currentOffset, currentOffset + TOPICS_PER_SUBSCRIBER);

    await client.unsubscribe(oldTopics);
    await client.subscribe(newTopics, callback);

    console.log(
      `Subscriber ${id} rotated: unsubscribed from ${oldTopics.slice(0, 3).join(", ")}..., subscribed to ${newTopics.slice(0, 3).join(", ")}...`
    );
  };

  const initialTopics = allTopics.slice(currentOffset, currentOffset + TOPICS_PER_SUBSCRIBER);

  await client.subscribe(initialTopics, callback);

  setInterval(() => void rotateSubscriptions(), SUBSCRIPTION_ROTATION_MS);

  return client;
};

const main = async () => {
  console.log("Starting publishers and subscribers...\n");

  const publishers = Array.from({ length: NUM_PUBLISHERS }, (_, i) => createPublisher(i));
  const subscribers = Array.from({ length: NUM_SUBSCRIBERS }, (_, i) => createSubscriber(i));

  await Promise.race(publishers);
  await Promise.all(subscribers);
};

main().catch(console.error);

import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { PollingHttpClient, SSEPubSubClient } from "../src";

const GATEWAY_URL = "http://localhost:3000";
const NUM_PUBLISHERS = 5;
const NUM_SUBSCRIBERS = 10;
const NUM_WILDCARD_SUBSCRIBERS = 3;
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
  Array.from({ length: count }, (_, i) => `${prefix}_${id}/${i}`);

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
  const allTopics = Array.from({ length: 50 }, (_, i) => `topic_${Math.floor(i / 10)}/${i % 10}`);
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
    await client.subscribe(newTopics);

    console.log(
      `Subscriber ${id} rotated: unsubscribed from ${oldTopics.slice(0, 3).join(", ")}..., subscribed to ${newTopics.slice(0, 3).join(", ")}...`
    );
  };

  const initialTopics = allTopics.slice(currentOffset, currentOffset + TOPICS_PER_SUBSCRIBER);

  client.setOnMessageHandler(callback);
  await client.subscribe(initialTopics);

  setInterval(() => void rotateSubscriptions(), SUBSCRIPTION_ROTATION_MS);

  return client;
};

const createWildcardSubscriber = async (id: number) => {
  const client = new clientToUse(GATEWAY_URL);
  const messageCount = new Map<string, number>();

  const wildcardPatterns = [[`topic_0/#`], [`topic_1/+`], [`+/5`, `+/7`]];

  let currentPatternIndex = id % wildcardPatterns.length;

  const callback = (topic: string, data: unknown) => {
    const count = messageCount.get(topic) || 0;
    messageCount.set(topic, count + 1);

    if (count % 10 === 0) {
      const decoded = data as Package;
      console.log(`${Date.now().toLocaleString()} WildcardSub ${id} - ${topic}:`, {
        count,
        latency: Date.now() - decoded.timestamp,
        value: decoded.value.toFixed(2),
      });
    }
  };

  const rotatePatterns = async () => {
    const oldPatterns = wildcardPatterns[currentPatternIndex];

    currentPatternIndex = (currentPatternIndex + 1) % wildcardPatterns.length;

    const newPatterns = wildcardPatterns[currentPatternIndex];

    await client.unsubscribe(oldPatterns);
    await client.subscribe(newPatterns, callback);

    console.log(`WildcardSub ${id} rotated: ${oldPatterns.join(", ")} → ${newPatterns.join(", ")}`);
  };

  const initialPatterns = wildcardPatterns[currentPatternIndex];

  await client.subscribe(initialPatterns, callback);

  setInterval(() => void rotatePatterns(), SUBSCRIPTION_ROTATION_MS);

  return client;
};

const main = async () => {
  console.log("Starting publishers and subscribers...\n");

  const publishers = Array.from({ length: NUM_PUBLISHERS }, (_, i) => createPublisher(i));
  const subscribers = Array.from({ length: NUM_SUBSCRIBERS }, (_, i) => createSubscriber(i));
  const wildcardSubscribers = Array.from({ length: NUM_WILDCARD_SUBSCRIBERS }, (_, i) =>
    createWildcardSubscriber(i)
  );

  await Promise.race(publishers);
  await Promise.all([...subscribers, ...wildcardSubscribers]);
};

main().catch(console.error);

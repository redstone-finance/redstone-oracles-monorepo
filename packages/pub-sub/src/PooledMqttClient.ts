import { ContentTypes } from "@redstone-finance/internal-utils";
import { loggerFactory } from "@redstone-finance/utils";
import { Mutex } from "async-mutex";
import _ from "lodash";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";
import { PubSubClientFactory } from "./PubSubClientFactory";

/** AWS enforce limit per connection  */
const MAX_REQ_PER_SECOND_PER_CONNECTION = 100;

/**
 * Using subscribe and unsubscribe together in Promise.all doesn't give any performance boost because of the mutex
 * connectionsPerTopic - only makes sense in the context of subscribe depending on number of messages received
 */
export class PooledMqttClient implements PubSubClient {
  clientToTopics: [PubSubClient, string[]][] = [];
  publishClients: PubSubClient[] = [];

  // we have to use mutex to avoid concurrent modifications of clientToTopics array
  subscribeMutex = new Mutex();
  publishMutex = new Mutex();
  logger = loggerFactory("multi-pub-sub-client");

  constructor(
    private readonly pubSubClientFactory: PubSubClientFactory,
    private readonly connectionsPerTopic: number,
    // first instance is created on first publish so we pass it explicit to avoid returning dummy value in getUniqueName()
    private readonly uniqueName: string,
    // When defined, only topics containing any of these filters will be subscribed.
    // When undefined, all topics are subscribed (no filtering).
    private readonly topicFilters?: string[]
  ) {}

  getUniqueName(): string {
    return this.uniqueName;
  }

  /** Created clients are not recycled */
  async publish(payloads: PubSubPayload[], contentType: ContentTypes): Promise<void> {
    await this.publishMutex.acquire();

    try {
      const neededClientsCount = Math.ceil(payloads.length / MAX_REQ_PER_SECOND_PER_CONNECTION);
      const missingClientsCount = neededClientsCount - this.publishClients.length;

      for (let i = 0; i < missingClientsCount; i++) {
        this.publishClients.push(await this.pubSubClientFactory());
      }

      const chunksToPublish = _.chunk(payloads, MAX_REQ_PER_SECOND_PER_CONNECTION);

      await Promise.all(
        chunksToPublish.map((payloads, index) =>
          this.publishClients[index].publish(payloads, contentType)
        )
      );
    } finally {
      this.publishMutex.release();
    }
  }

  async subscribe(topics: string[], onMessage: SubscribeCallback): Promise<void> {
    const filteredTopics =
      this.topicFilters === undefined
        ? topics
        : topics.filter((t) => this.topicFilters!.some((f) => t.includes(f)));

    if (filteredTopics.length === 0) {
      this.logger.info(
        `No topics matched filters ${JSON.stringify(this.topicFilters)}, skipping subscribe`
      );
      return;
    }

    await this.subscribeMutex.acquire();
    try {
      await this._subscribe(filteredTopics, onMessage);
      this.logger.info(
        `Requested ${topics.length} topics, subscribed to ${filteredTopics.length} topics, active ${this.clientToTopics.length} connections`
      );
    } finally {
      this.subscribeMutex.release();
    }
  }

  async unsubscribe(topics: string[]): Promise<void> {
    await this.subscribeMutex.acquire();

    try {
      const updatedClientToTopics: [PubSubClient, string[]][] = [];
      for (const [client, assignedTopics] of this.clientToTopics) {
        const matchedTopics = assignedTopics.filter((t) => topics.includes(t));
        const remainingTopics = assignedTopics.filter((t) => !topics.includes(t));

        if (matchedTopics.length > 0) {
          await client.unsubscribe(matchedTopics);
        }

        if (remainingTopics.length > 0) {
          updatedClientToTopics.push([client, remainingTopics]);
        } else {
          client.stop();
        }
      }
      this.clientToTopics = updatedClientToTopics;
    } finally {
      this.subscribeMutex.release();
    }

    this.logger.info(
      `Unsubscribed from ${topics.length} topics, active ${this.clientToTopics.length} connections`
    );
  }

  stop(): void {
    for (const [client, _] of this.clientToTopics) {
      client.stop();
    }
    for (const client of this.publishClients) {
      client.stop();
    }
    this.publishClients = [];
    this.clientToTopics = [];
  }

  async _subscribe(topics: string[], onMessage: SubscribeCallback): Promise<void> {
    const topicToAdd = [...topics];
    const freeClients = this.clientToTopics.filter(
      ([_, topics]) => topics.length < this.connectionsPerTopic
    );

    if (freeClients.length === 0) {
      this.clientToTopics.push([await this.pubSubClientFactory(), []]);
      await this._subscribe(topicToAdd, onMessage);
      return;
    }

    for (const [client, subscribedTopics] of freeClients) {
      const topicsToSubscribe = topicToAdd.splice(
        0,
        this.connectionsPerTopic - subscribedTopics.length
      );

      if (topicsToSubscribe.length > 0) {
        await client.subscribe(topicsToSubscribe, onMessage);
        subscribedTopics.push(...topicsToSubscribe);
      }
    }

    if (topicToAdd.length !== 0) {
      await this._subscribe(topicToAdd, onMessage);
    }
  }
}

import { ContentTypes } from "@redstone-finance/internal-utils";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "./PubSubClient";

export type MultiPubSubConfig = {
  client: PubSubClient;
  name: string;
};

const DEFAULT_TIMEOUT_PER_CLIENT = 10_000;

export class MultiPubSubClient implements PubSubClient {
  logger = loggerFactory("multi-pub-sub-client");
  private readonly uniqueName: string;

  constructor(
    private readonly pubSubConfigs: MultiPubSubConfig[],
    readonly timeoutPerClient = DEFAULT_TIMEOUT_PER_CLIENT
  ) {
    RedstoneCommon.assert(
      pubSubConfigs.length > 0,
      `MultiPubSubClient requires at least one client`
    );
    this.uniqueName = this.pubSubConfigs.map((x) => x.name).join("#");
  }

  getUniqueName(): string {
    return this.uniqueName;
  }

  /** Publish data to all channels, fails only if all clients fail */
  async publish(payloads: PubSubPayload[], contentType: ContentTypes): Promise<void> {
    const results = await Promise.allSettled(
      this.pubSubConfigs.map((config) =>
        RedstoneCommon.timeout(config.client.publish(payloads, contentType), this.timeoutPerClient)
      )
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

  setOnMessageHandler(onMessage: SubscribeCallback): void {
    for (const config of this.pubSubConfigs) {
      config.client.setOnMessageHandler(onMessage);
    }
  }

  /** Receive data from multiple channels thus expect duplicates, fails only if all clients fail */
  async subscribe(topics: string[]): Promise<void> {
    const results = await Promise.allSettled(
      this.pubSubConfigs.map((config) =>
        RedstoneCommon.timeout(config.client.subscribe(topics), this.timeoutPerClient)
      )
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

  /** Fails if any of pub-sub clients fail **/
  async unsubscribe(topics: string[]): Promise<void> {
    await Promise.all(
      this.pubSubConfigs.map((config) =>
        RedstoneCommon.timeout(config.client.unsubscribe(topics), this.timeoutPerClient)
      )
    );
  }

  stop(): void {
    this.pubSubConfigs.forEach((config) => config.client.stop());
  }
}

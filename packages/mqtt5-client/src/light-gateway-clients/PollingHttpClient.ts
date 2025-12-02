import { httpClient as defaultHttpClient, HttpClient } from "@redstone-finance/http-client";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "../PubSubClient";
import { ClientCommon } from "./ClientCommon";
import { GET_DATA_ROUTE } from "./routes";

const LOGGER_NAME = "polling-http-client";
const CONTENT_TYPE_JSON = "application/json";

const DEFAULT_INTERVAL_MS = 5000;

type Packages = {
  topic: string;
  data: string[];
};

export class PollingHttpClient implements PubSubClient {
  private readonly logger = loggerFactory(LOGGER_NAME);
  private readonly topics: Set<string> = new Set();
  private readonly httpClient: HttpClient;
  private readonly common: ClientCommon;

  private callback?: SubscribeCallback;
  private pollingInterval?: NodeJS.Timeout;
  private isPolling = false;

  constructor(
    lightGatewayAddress: string,
    private readonly pollingIntervalMs = DEFAULT_INTERVAL_MS,
    httpClient?: HttpClient
  ) {
    this.httpClient = httpClient ?? defaultHttpClient;
    this.common = new ClientCommon(this.httpClient, lightGatewayAddress, this.logger);
  }

  async publish(payloads: PubSubPayload[]) {
    return await this.common.publish(payloads);
  }

  subscribe(topics: string[], onMessage: SubscribeCallback) {
    this.callback = onMessage;

    for (const topic of topics) {
      this.topics.add(topic);
    }
    this.logger.info("Subscribed to topics", { topics });

    this.startPolling();

    return Promise.resolve();
  }

  unsubscribe(topics: string[]) {
    const removedTopics: string[] = [];

    for (const topic of topics) {
      if (this.topics.delete(topic)) {
        removedTopics.push(topic);
      }
    }

    if (removedTopics.length > 0) {
      this.logger.info("Unsubscribed from topics", { topics: removedTopics });
    }
    return Promise.resolve();
  }

  getUniqueName() {
    return `polling-client::${this.common.lightGatewayAddress}`;
  }

  stop() {
    this.stopPolling();
  }

  async getData(): Promise<Map<string, unknown[]>> {
    const topicsToFetch = Array.from(this.topics.keys());

    if (topicsToFetch.length === 0) {
      this.logger.warn("No topics to fetch data for");

      return new Map();
    }

    try {
      const response = await this.httpClient.post<Packages[]>(
        this.common.getUrl(GET_DATA_ROUTE),
        topicsToFetch,
        { headers: { "Content-Type": CONTENT_TYPE_JSON } }
      );

      const result = new Map<string, unknown[]>();

      for (const pkg of response.data) {
        const deserializedItems = pkg.data
          .map((item) =>
            this.tryDeserialize(pkg.topic, item, (errorMsg) => {
              if (this.callback) {
                this.callback(pkg.topic, null, errorMsg, this);
              } else {
                this.logger.warn(errorMsg);
              }
            })
          )
          .filter((item): item is unknown => item !== undefined);

        result.set(pkg.topic, deserializedItems);
      }

      this.logger.debug("Fetched data", {
        topicCount: result.size,
        totalPackages: Array.from(result.values()).reduce((sum, items) => sum + items.length, 0),
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch data, error=${RedstoneCommon.stringifyError(error)}`);
      throw error;
    }
  }

  private tryDeserialize(
    topic: string,
    serializedData: string,
    errorHandler: (errorMsg: string) => void
  ) {
    try {
      return this.common.deserializeData(serializedData);
    } catch (error) {
      const errorMessage = `Failed to deserialize data for topic ${topic}, error=${RedstoneCommon.stringifyError(error)}`;

      errorHandler(errorMessage);

      return undefined;
    }
  }

  startPolling() {
    if (this.isPolling) {
      this.logger.info("Polling is already active");
      return;
    }

    this.isPolling = true;

    this.pollingInterval = setInterval(() => {
      this.pollData().catch((error) => {
        this.logger.error(
          `Error during scheduled poll, error=${RedstoneCommon.stringifyError(error)}`
        );
      });
    }, this.pollingIntervalMs);

    this.logger.info("Started polling for data", {
      intervalMs: this.pollingIntervalMs,
      topics: Array.from(this.topics.keys()),
    });
  }

  stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    clearInterval(this.pollingInterval);
    this.pollingInterval = undefined;
    this.logger.info("Stopped polling for data");
  }

  private async pollData() {
    if (this.topics.size === 0) {
      this.logger.warn("Attempt to poll data for 0 topics");
      return;
    }

    if (!this.isPolling || !this.callback) {
      this.logger.warn("Attempt to pull data when client is in inconsistent state");
      return;
    }

    let dataByTopic: Map<string, unknown[]>;
    try {
      dataByTopic = await this.getData();
    } catch (error) {
      this.logger.warn(`Failed to poll data, error=${RedstoneCommon.stringifyError(error)}`);
      return;
    }

    for (const [topic, items] of dataByTopic.entries()) {
      for (const item of items) {
        this.invokeCallback(topic, item);
      }
    }
  }

  private invokeCallback(topic: string, data: unknown) {
    try {
      this.callback!(topic, data, null, this);
    } catch (error) {
      this.logger.warn(
        `Callback failed for topic ${topic}, error=${RedstoneCommon.stringifyError(error)}`
      );
    }
  }
}

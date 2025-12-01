import { httpClient as defaultHttpClient, HttpClient } from "@redstone-finance/http-client";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PubSubClient, PubSubPayload, SubscribeCallback } from "../PubSubClient";
import { ClientCommon } from "./ClientCommon";

export const GET_DATA_ROUTE = "get_data";

const LOGGER_NAME = "polling-http-client";
const CONTENT_TYPE_JSON = "application/json";

const DEFAULT_INTERVAL_MS = 5000;

type Packages = {
  topic: string;
  data: string[];
};

export interface PollingOptions {
  intervalMs?: number;
}

export class PollingHttpClient implements PubSubClient {
  private readonly logger = loggerFactory(LOGGER_NAME);
  private readonly topics: Set<string> = new Set();
  private readonly httpClient: HttpClient;
  private readonly common: ClientCommon;

  private callback?: SubscribeCallback;
  private pollingInterval?: NodeJS.Timeout;
  private pollingOptions: PollingOptions = {
    intervalMs: DEFAULT_INTERVAL_MS,
  };
  private isPolling = false;

  constructor(
    private readonly lightGatewayAddress: string,
    httpClient?: HttpClient,
    pollingOptions?: PollingOptions
  ) {
    this.httpClient = httpClient ?? defaultHttpClient;
    this.common = new ClientCommon(
      this.httpClient,
      this.lightGatewayAddress,
      GET_DATA_ROUTE,
      this.logger
    );
    if (pollingOptions) {
      this.pollingOptions = { ...this.pollingOptions, ...pollingOptions };
    }
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
    return this.lightGatewayAddress;
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

      const result = response.data.reduce((acc, data) => {
        const topic = data.topic;
        const decodedData = data.data
          .map((data) => {
            try {
              return this.common.deserializeData(data);
            } catch (error) {
              if (this.callback === undefined) {
                this.logger.warn(
                  `Failed to deserialize data for topic ${topic}, error=${RedstoneCommon.stringifyError(error)}`
                );
              } else {
                this.callback(
                  topic,
                  null,
                  `Failed to deserialize data for topic ${topic}, error=${RedstoneCommon.stringifyError(error)}`,
                  this
                );
              }
              return undefined;
            }
          })
          .filter((item) => item !== undefined);
        acc.set(data.topic, decodedData);
        return acc;
      }, new Map<string, unknown[]>());

      this.logger.debug("Fetched data", {
        topicCount: result.size,
        totalPackages: Array.from(result.values()).reduce((sum, data) => sum + data.length, 0),
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch data, error=${RedstoneCommon.stringifyError(error)}`);
      throw error;
    }
  }

  startPolling() {
    if (this.isPolling) {
      this.logger.info("Polling is already active");
      return;
    }

    this.isPolling = true;

    const intervalMs = this.pollingOptions.intervalMs ?? DEFAULT_INTERVAL_MS;

    this.pollingInterval = setInterval(() => {
      this.pollData().catch((error) => {
        this.logger.error(
          `Error during scheduled poll, error=${RedstoneCommon.stringifyError(error)}`
        );
      });
    }, intervalMs);

    this.logger.info("Started polling for data", {
      intervalMs,
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

    let data: Map<string, unknown[]>;
    try {
      data = await this.getData();
    } catch (error) {
      this.logger.warn(`Failed to poll data, error=${RedstoneCommon.stringifyError(error)}`);
      return;
    }

    for (const [topic, dataArray] of data.entries()) {
      for (const data of dataArray) {
        try {
          this.callback(topic, data, null, this);
        } catch (error) {
          this.logger.warn(
            `Callback failed for topic ${topic}, error=${RedstoneCommon.stringifyError(error)}`
          );
        }
      }
    }
  }
}

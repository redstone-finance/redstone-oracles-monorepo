import { HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { GET_DATA_ROUTE, PollingHttpClient } from "../src";

const GATEWAY_ADDRESS = "0.0.0.0:8000";

class MockHttpClient {
  postMock = jest.fn();
  private data: Map<string, unknown[]> = new Map();

  init() {
    this.postMock.mockClear();
    this.data.clear();
  }

  setData(topic: string, data: unknown[]) {
    this.data.set(topic, data);
  }

  post(urlSuffix: string, msg: unknown, config: { headers: Record<string, string> }) {
    if (urlSuffix.includes(GET_DATA_ROUTE)) {
      const topics = msg as string[];
      const deflateJson = new DeflateJson();
      const response = topics.map((topic) => {
        const data = this.data.get(topic) || [];
        return {
          topic,
          data: data.map((d) => Buffer.from(deflateJson.serialize(d)).toString("base64")),
        };
      });
      this.postMock(urlSuffix, topics, config);
      return Promise.resolve({ data: response });
    }

    this.postMock(urlSuffix, msg, config);
    return Promise.resolve({ data: {} });
  }
}

const MOCK = new MockHttpClient();

const POLLING_INTERVAL_MS = 1000;

describe("PollingHttpClient", () => {
  let client: PollingHttpClient;

  beforeEach(() => {
    MOCK.init();
    client = new PollingHttpClient(
      GATEWAY_ADDRESS,
      POLLING_INTERVAL_MS,
      MOCK as unknown as HttpClient
    );
  });

  afterEach(() => {
    client.stop();
  });

  describe("Data polling", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const polling_cycle = async () => {
      // Wait for initial fetch - need to flush all pending promises
      jest.advanceTimersByTime(POLLING_INTERVAL_MS);
      await Promise.resolve(); // allow for HTTP request to complete
      await Promise.resolve(); // allow this.getData() to complete
    };

    it("should fetch data for subscribed topics", async () => {
      MOCK.setData("topic1", [456, 789]);
      MOCK.setData("topic2", [999]);

      await client.subscribe(["topic1", "topic2"], () => {});

      const data = await client.getData();

      expect(data.size).toBe(2);
      expect(data.get("topic1")).toEqual([456, 789]);
      expect(data.get("topic2")).toEqual([999]);

      expect(MOCK.postMock).toHaveBeenCalledWith(
        `http://${GATEWAY_ADDRESS}/${GET_DATA_ROUTE}`,
        ["topic1", "topic2"],
        { headers: { "Content-Type": "application/json" } }
      );
    });

    it("should start polling and call callback with data", async () => {
      const onMessage = jest.fn();
      MOCK.setData("topic1", [100, 200]);
      MOCK.setData("topic2", [300]);

      await client.subscribe(["topic1", "topic2"], onMessage);
      client.startPolling();
      await polling_cycle();

      expect(onMessage).toHaveBeenCalledWith("topic1", 100, null, expect.anything());
      expect(onMessage).toHaveBeenCalledWith("topic1", 200, null, expect.anything());
      expect(onMessage).toHaveBeenCalledWith("topic2", 300, null, expect.anything());
    });

    it("should poll at specified interval", async () => {
      const onMessage = jest.fn();
      MOCK.setData("topic1", [1]);

      await client.subscribe(["topic1"], onMessage);
      client.startPolling();

      // First poll
      await polling_cycle();

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith("topic1", 1, null, expect.anything());

      // Second poll
      MOCK.setData("topic1", [2]);
      await polling_cycle();

      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(onMessage).toHaveBeenLastCalledWith("topic1", 2, null, expect.anything());
    });

    it("should stop polling", () => {
      client.startPolling();
      expect(client["isPolling"]).toBe(true);
      expect(client["pollingInterval"]).toBeDefined();

      client.stopPolling();
      expect(client["isPolling"]).toBe(false);
      expect(client["pollingInterval"]).toBeUndefined();
    });

    it("should not start polling if already active", () => {
      client.startPolling();
      const firstInterval = client["pollingInterval"];

      client.startPolling();
      expect(client["pollingInterval"]).toBe(firstInterval);
    });

    it("should stop polling when client is stopped", () => {
      client.startPolling();
      expect(client["isPolling"]).toBe(true);
      expect(client["pollingInterval"]).toBeDefined();

      // stop() should synchronously call stopPolling() which sets isPolling = false
      client.stop();

      expect(client["isPolling"]).toBe(false);
      expect(client["pollingInterval"]).toBeUndefined();
    });

    it("should subscribe and unsubscribe without SSE or sessions", async () => {
      const onMessage = jest.fn();

      await client.subscribe(["topic1", "topic2"], onMessage);
      expect(client["topics"].size).toBe(2);
      expect(client["topics"].has("topic1")).toBe(true);
      expect(client["topics"].has("topic2")).toBe(true);

      await client.unsubscribe(["topic1"]);
      expect(client["topics"].size).toBe(1);
      expect(client["topics"].has("topic1")).toBe(false);
      expect(client["topics"].has("topic2")).toBe(true);
    });
  });
});

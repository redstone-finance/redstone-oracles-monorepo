import { HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { POST_DATA_BATCH_ROUTE, SSEPubSubClient } from "../src";
import { buildBatchBody } from "../src/light-gateway-clients/batch_framing";

const GATEWAY_ADDRESS = "http://0.0.0.0:8000";
const SESSION_ID = "mock_session_id";
const deflateJson = new DeflateJson();

type PackageEvent = { lastEventId: string; data: string };

class MockHttpClientAndEventSource {
  packageCallbacks: ((event: PackageEvent) => void)[] = [];
  postMock = jest.fn();

  init() {
    this.packageCallbacks = [];
    this.postMock.mockClear();
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  get(_url: string) {
    return Promise.resolve({ data: "v1" });
  }

  post(url: string, msg: unknown, config: { headers: Record<string, string> }) {
    this.postMock(url, msg, config);

    return Promise.resolve({ data: {} });
  }

  addEventListener(event: string, callback: (data: unknown) => void) {
    if (event === "connected") {
      callback({ data: JSON.stringify({ session_id: SESSION_ID }) });
    } else if (event === "package") {
      this.packageCallbacks.push(callback);
    } else {
      throw new Error(`Unknown event type: ${event}`);
    }
  }
}

const MOCK = new MockHttpClientAndEventSource();

jest.mock("eventsource", () => {
  return {
    EventSource: jest.fn(() => MOCK),
  };
});

describe("SSEPubSubClient", () => {
  let client: SSEPubSubClient;

  beforeEach(async () => {
    MOCK.init();
    client = new SSEPubSubClient(GATEWAY_ADDRESS, MOCK as unknown as HttpClient);
    await client.start();
  });

  it("should initialize session id", () => {
    expect(client["sessionId"]).toBe(SESSION_ID);
  });

  it("should publish properly", async () => {
    await client.publish([{ topic: "topic1", data: 123 }]);

    const expectedBody = buildBatchBody([
      {
        topicBytes: Buffer.from("topic1", "utf8"),
        dataB64: Buffer.from(deflateJson.serialize(123).toString("base64"), "ascii"),
      },
    ]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/${POST_DATA_BATCH_ROUTE}`,
      expectedBody,
      { headers: { "Content-Type": "application/octet-stream" } }
    );
  });

  it("should publish properly multiple topics", async () => {
    await client.publish([
      { topic: "topic1", data: 123 },
      { topic: "topic2", data: 321 },
    ]);

    const expectedBody = buildBatchBody([
      {
        topicBytes: Buffer.from("topic1", "utf8"),
        dataB64: Buffer.from(deflateJson.serialize(123).toString("base64"), "ascii"),
      },
      {
        topicBytes: Buffer.from("topic2", "utf8"),
        dataB64: Buffer.from(deflateJson.serialize(321).toString("base64"), "ascii"),
      },
    ]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/${POST_DATA_BATCH_ROUTE}`,
      expectedBody,
      { headers: { "Content-Type": "application/octet-stream" } }
    );
  });

  it("should subscribe properly", async () => {
    client.setOnMessageHandler(() => {});
    await client.subscribe(["topic1"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic1"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should subscribe properly when called multiple times", async () => {
    client.setOnMessageHandler(() => {});
    await client.subscribe(["topic1"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic1"] },
      { headers: { "Content-Type": "application/json" } }
    );

    await client.subscribe(["topic1", "topic2"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );

    await client.subscribe(["topic3", "topic4"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic3", "topic4"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should not unsubscribe when not subscribed before", async () => {
    await client.unsubscribe(["topic1"]);

    expect(MOCK.postMock).toHaveBeenCalledTimes(0);
  });

  it("should unsubscribe only from topics subscribed to before", async () => {
    client.setOnMessageHandler(() => {});
    await client.subscribe(["topic1", "topic2", "topic3"]);
    await client.unsubscribe(["topic1", "topic2", "topic4"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/unsubscribe_from_topics`,
      { session_id: client["sessionId"], topics: ["topic1", "topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should call callback with proper values", async () => {
    const onMessage = jest.fn();
    client.setOnMessageHandler(onMessage);
    await client.subscribe(["topic1", "topic2"]);

    MOCK.packageCallbacks[0]({
      lastEventId: "topic1",
      data: deflateJson.serialize(123).toString("base64"),
    });
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, expect.anything());

    MOCK.packageCallbacks[0]({
      lastEventId: "topic1",
      data: deflateJson.serialize(123).toString("base64"),
    });
    MOCK.packageCallbacks[0]({
      lastEventId: "topic2",
      data: deflateJson.serialize(321).toString("base64"),
    });
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, expect.anything());
    expect(onMessage).toHaveBeenCalledWith("topic2", 321, null, expect.anything());
  });

  it("should call callback with error on failure", async () => {
    const onMessage = jest.fn();
    client.setOnMessageHandler(onMessage);
    await client.subscribe(["topic1"]);

    MOCK.packageCallbacks[0]({ lastEventId: "topic1", data: "invalid-base64-data" });

    expect(onMessage).toHaveBeenCalledWith(
      "topic1",
      null,
      expect.stringContaining("Error occurred when tried to parse message"),
      client
    );
  });

  it("should cleanup and throw error when subscription fails", async () => {
    MOCK.postMock.mockImplementationOnce(() => {
      throw new Error("Network error");
    });

    client.setOnMessageHandler(() => {});
    await expect(client.subscribe(["topic1", "topic2"])).rejects.toThrow(
      "Subscription failed for topics=topic1, topic2"
    );

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: SESSION_ID, topics: ["topic1", "topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/unsubscribe_from_topics`,
      { session_id: SESSION_ID, topics: ["topic1", "topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should not call callback when deserialization fails", async () => {
    const onMessage = jest.fn((_, data) => {
      if (data) {
        throw new Error("Callback error");
      }
    });

    client.setOnMessageHandler(onMessage);
    await client.subscribe(["topic1"]);

    MOCK.packageCallbacks[0]({ lastEventId: "topic1", data: "invalid-base64-data" });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      "topic1",
      null,
      expect.stringContaining("Error occurred when tried to parse message"),
      client
    );
  });
});

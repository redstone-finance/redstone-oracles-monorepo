import { decode } from "@msgpack/msgpack";
import { HttpClient } from "@redstone-finance/http-client";
import { DeflateJson } from "@redstone-finance/internal-utils";
import { POST_DATA_ROUTE, SSEPubSubClient } from "../src";

const GATEWAY_ADDRESS = "http://0.0.0.0:8000";
const SESSION_ID = "mock_session_id";

class MockHttpClientAndEventSource {
  batchCallbacks: ((data: unknown) => void)[] = [];
  postMock = jest.fn();

  init() {
    this.batchCallbacks = [];
    this.postMock.mockClear();
  }

  post(urlSuffix: string, msg: unknown, config: { headers: Record<string, string> }) {
    if (msg instanceof Object && "session_id" in msg) {
      this.postMock(urlSuffix, msg, config);
      return Promise.resolve({ data: {} });
    }

    const data = decode(msg as Buffer) as [{ topic: string; data: Buffer }];
    const dataDecoded = data.map((payload) => ({
      topic: payload.topic,
      data: Buffer.from(payload.data),
    }));

    for (const callback of this.batchCallbacks) {
      callback({ data: JSON.stringify(dataDecoded) });
    }

    const deflateJson = new DeflateJson();
    const dataRaw = data.map((payload) => ({
      topic: payload.topic,
      data: deflateJson.deserialize(payload.data),
    }));

    this.postMock(urlSuffix, dataRaw, config);
    return Promise.resolve({ data: {} });
  }

  addEventListener(event: string, callback: (data: unknown) => void) {
    if (event === "connected") {
      callback({ data: JSON.stringify({ session_id: SESSION_ID }) });
    } else if (event === "batch") {
      this.batchCallbacks.push(callback);
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

  beforeEach(() => {
    MOCK.init();
    client = new SSEPubSubClient(GATEWAY_ADDRESS, MOCK as unknown as HttpClient);
    client.start();
  });

  it("should initialize session id", () => {
    expect(client["sessionId"]).toBe(SESSION_ID);
  });

  it("should publish properly", async () => {
    const data = [{ topic: "topic1", data: 123 }];
    await client.publish(data);

    expect(MOCK.postMock).toHaveBeenCalledWith(`${GATEWAY_ADDRESS}/${POST_DATA_ROUTE}`, data, {
      headers: { "Content-Type": "application/msgpack" },
    });
  });

  it("should publish properly multiple topics", async () => {
    const data = [
      { topic: "topic1", data: 123 },
      { topic: "topic2", data: 321 },
    ];
    await client.publish(data);

    expect(MOCK.postMock).toHaveBeenCalledWith(`${GATEWAY_ADDRESS}/${POST_DATA_ROUTE}`, data, {
      headers: { "Content-Type": "application/msgpack" },
    });
  });

  it("should subscribe properly", async () => {
    await client.subscribe(["topic1"], () => {});

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic1"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should subscribe properly when called multiple times", async () => {
    await client.subscribe(["topic1"], () => {});

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic1"] },
      { headers: { "Content-Type": "application/json" } }
    );

    await client.subscribe(["topic1", "topic2"], () => {});

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: client["sessionId"], topics: ["topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );

    await client.subscribe(["topic3", "topic4"], () => {});

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
    await client.subscribe(["topic1", "topic2", "topic3"], () => {});
    await client.unsubscribe(["topic1", "topic2", "topic4"]);

    expect(MOCK.postMock).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/unsubscribe_from_topics`,
      { session_id: client["sessionId"], topics: ["topic1", "topic2"] },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it("should call callback with proper values", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1", "topic2"], onMessage);

    await client.publish([{ topic: "topic1", data: 123 }]);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, expect.anything());

    await client.publish([
      { topic: "topic1", data: 123 },
      { topic: "topic2", data: 321 },
    ]);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, expect.anything());
    expect(onMessage).toHaveBeenCalledWith("topic2", 321, null, expect.anything());
  });

  it("should call callback with error on failure", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1"], onMessage);

    MOCK.batchCallbacks[0]({
      data: JSON.stringify([{ topic: "topic1", data: "invalid-base64-data" }]),
    });

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

    await expect(client.subscribe(["topic1", "topic2"], () => {})).rejects.toThrow(
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

    await client.subscribe(["topic1"], onMessage);

    MOCK.batchCallbacks[0]({
      data: JSON.stringify([{ topic: "topic1", data: "invalid-base64-data" }]),
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      "topic1",
      null,
      expect.stringContaining("Error occurred when tried to parse message"),
      client
    );
  });
});

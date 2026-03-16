import { mqttTopicToNatsSubject, NatsClient, natsSubjectToMqttTopic } from "../src/NatsClient";

const mockSub1 = { unsubscribe: jest.fn() };
const mockSub2 = { unsubscribe: jest.fn() };
let subIndex = 0;

const mockHeaders = { set: jest.fn(), get: jest.fn() };

async function* emptyStatusIterable() {}

const mockNc = {
  publish: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockImplementation(() => (subIndex++ % 2 === 0 ? mockSub1 : mockSub2)),
  drain: jest.fn().mockResolvedValue(undefined),
  status: jest.fn().mockReturnValue(emptyStatusIterable()),
};

const mockConnect = jest.fn().mockResolvedValue(mockNc);

jest.mock("nats", () => ({
  connect: (...args: unknown[]): unknown => mockConnect(...args),
  headers: (): unknown => mockHeaders,
}));

// Simple passthrough serializer/deserializer for tests
jest.mock("@redstone-finance/internal-utils", (): unknown => ({
  getSerializerDeserializer: () => ({
    serialize: (data: unknown) => Buffer.from(JSON.stringify(data)),
    deserialize: (buf: Buffer) => JSON.parse(buf.toString()) as unknown,
  }),
}));

describe("mqttTopicToNatsSubject", () => {
  it("replaces / with .", () => {
    expect(mqttTopicToNatsSubject("data-package/redstone-primary/BTC/0xabc")).toBe(
      "data-package.redstone-primary.BTC.0xabc"
    );
  });

  it("replaces + with *", () => {
    expect(mqttTopicToNatsSubject("data-package/redstone-primary/+/0xabc")).toBe(
      "data-package.redstone-primary.*.0xabc"
    );
  });

  it("replaces # with >", () => {
    expect(mqttTopicToNatsSubject("data-package/redstone-primary/#")).toBe(
      "data-package.redstone-primary.>"
    );
  });

  it("handles topics without separators", () => {
    expect(mqttTopicToNatsSubject("simple")).toBe("simple");
  });
});

describe("natsSubjectToMqttTopic", () => {
  it("replaces . with /", () => {
    expect(natsSubjectToMqttTopic("data-package.redstone-primary.BTC.0xabc")).toBe(
      "data-package/redstone-primary/BTC/0xabc"
    );
  });

  it("handles subjects without separators", () => {
    expect(natsSubjectToMqttTopic("simple")).toBe("simple");
  });
});

describe("NatsClient", () => {
  let client: NatsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    subIndex = 0;
    client = new NatsClient({ host: "localhost:4222" });
  });

  describe("getUniqueName", () => {
    it("should return the host", () => {
      expect(client.getUniqueName()).toBe("nats::localhost:4222");
    });
  });

  describe("publish", () => {
    it("should connect lazily on first publish", async () => {
      await client.publish([{ topic: "t1", data: { val: 1 } }], "deflate+json");

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ servers: "nats://localhost:4222", timeout: 10_000 })
      );
    });

    it("should prepend nats:// scheme if missing", async () => {
      const c = new NatsClient({ host: "myhost:4222" });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ servers: "nats://myhost:4222" })
      );
    });

    it("should not prepend nats:// if already present", async () => {
      const c = new NatsClient({ host: "nats://myhost:4222" });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ servers: "nats://myhost:4222" })
      );
    });

    it("should use tls:// scheme and pass tls.ca when caCert is set", async () => {
      const caCert = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----";
      const c = new NatsClient({ host: "myhost:4222", caCert });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          servers: "tls://myhost:4222",
          tls: { ca: caCert },
        })
      );
    });

    it("should not set tls when caCert is absent", async () => {
      const c = new NatsClient({ host: "myhost:4222" });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ servers: "nats://myhost:4222", tls: null })
      );
    });

    it("should preserve tls:// prefix when caCert is set and host already has it", async () => {
      const caCert = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----";
      const c = new NatsClient({ host: "tls://myhost:4222", caCert });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({ servers: "tls://myhost:4222", tls: { ca: caCert } })
      );
    });

    it("should use custom connectionTimeoutMs", async () => {
      const c = new NatsClient({ host: "localhost:4222", connectionTimeoutMs: 5_000 });
      await c.publish([{ topic: "t1", data: {} }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ timeout: 5_000 }));
    });

    it("should reset connecting promise on failure so next call retries", async () => {
      mockConnect.mockRejectedValueOnce(new Error("timeout"));

      await expect(client.publish([{ topic: "t1", data: 1 }], "deflate+json")).rejects.toThrow(
        "timeout"
      );
      expect(mockConnect).toHaveBeenCalledTimes(1);

      // Second call must attempt a new connection, not reuse the rejected promise
      await client.publish([{ topic: "t1", data: 1 }], "deflate+json");
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it("should reuse existing connection on second call", async () => {
      await client.publish([{ topic: "t1", data: 1 }], "deflate+json");
      await client.publish([{ topic: "t2", data: 2 }], "deflate+json");

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("should call nc.publish for each payload with content-type header", async () => {
      const payloads = [
        { topic: "topicA", data: { x: 1 } },
        { topic: "topicB", data: { x: 2 } },
      ];
      await client.publish(payloads, "deflate+json");

      expect(mockNc.publish).toHaveBeenCalledTimes(2);
      expect(mockNc.publish).toHaveBeenCalledWith(
        "topicA",
        expect.any(Buffer),
        expect.objectContaining({ headers: mockHeaders })
      );
      expect(mockNc.publish).toHaveBeenCalledWith(
        "topicB",
        expect.any(Buffer),
        expect.objectContaining({ headers: mockHeaders })
      );
      expect(mockHeaders.set).toHaveBeenCalledWith("Content-Type", "deflate+json");
    });

    it("should handle empty payload array", async () => {
      await client.publish([], "deflate+json");
      expect(mockNc.publish).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should connect and subscribe to each topic", async () => {
      await client.subscribe(["topic1", "topic2"]);

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockNc.subscribe).toHaveBeenCalledTimes(2);
      expect(mockNc.subscribe).toHaveBeenCalledWith("topic1", expect.any(Object));
      expect(mockNc.subscribe).toHaveBeenCalledWith("topic2", expect.any(Object));
    });

    it("should not re-subscribe to already subscribed topics", async () => {
      await client.subscribe(["topic1"]);
      await client.subscribe(["topic1", "topic2"]);

      expect(mockNc.subscribe).toHaveBeenCalledTimes(2); // topic1 once, topic2 once
    });

    it("should deliver messages to onMessageCallback with deserialized data", async () => {
      const onMessage = jest.fn();
      client.setOnMessageHandler(onMessage);
      await client.subscribe(["topic1"]);

      // Capture the callback passed to nc.subscribe
      const subscribeCall = mockNc.subscribe.mock.calls[0] as [
        string,
        { callback: (err: null, msg: unknown) => void },
      ];
      const callback = subscribeCall[1].callback;

      const testData = { price: 42 };
      const serialized = Buffer.from(JSON.stringify(testData));
      callback(null, {
        subject: "topic1",
        data: serialized,
        headers: { get: () => "deflate+json" },
      });

      expect(onMessage).toHaveBeenCalledWith("topic1", testData, null, client);
    });

    it("should call onMessageCallback with error when callback receives error", async () => {
      const onMessage = jest.fn();
      client.setOnMessageHandler(onMessage);
      await client.subscribe(["topic1"]);

      const subscribeCall = mockNc.subscribe.mock.calls[0] as [
        string,
        { callback: (err: Error, msg: unknown) => void },
      ];
      const callback = subscribeCall[1].callback;
      callback(new Error("NATS error"), null);

      expect(onMessage).toHaveBeenCalledWith("topic1", null, "NATS error", client);
    });

    it("should call onMessageCallback with error when deserialization fails", async () => {
      const onMessage = jest.fn();
      client.setOnMessageHandler(onMessage);
      await client.subscribe(["topic1"]);

      const subscribeCall = mockNc.subscribe.mock.calls[0] as [
        string,
        { callback: (err: null, msg: unknown) => void },
      ];
      const callback = subscribeCall[1].callback;

      // Pass invalid JSON so our mock JSON.parse deserializer throws
      callback(null, {
        subject: "topic1",
        data: Buffer.from("not valid json!!!"),
        headers: { get: () => "deflate+json" },
      });

      expect(onMessage).toHaveBeenCalledWith(
        "topic1",
        null,
        expect.stringContaining("JSON"),
        client
      );
    });
  });

  describe("unsubscribe", () => {
    beforeEach(async () => {
      await client.subscribe(["topic1", "topic2"]);
    });

    it("should call unsubscribe on the subscription object", async () => {
      await client.unsubscribe(["topic1"]);
      expect(mockSub1.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should remove the topic from internal subscriptions", async () => {
      await client.unsubscribe(["topic1"]);
      // Re-subscribing should create a new subscription
      await client.subscribe(["topic1"]);
      expect(mockNc.subscribe).toHaveBeenCalledTimes(3); // 2 initial + 1 re-subscribe
    });

    it("should handle unsubscribing from non-subscribed topic gracefully", async () => {
      await expect(client.unsubscribe(["unknown-topic"])).resolves.not.toThrow();
      expect(mockSub1.unsubscribe).not.toHaveBeenCalled();
    });

    it("should unsubscribe multiple topics", async () => {
      await client.unsubscribe(["topic1", "topic2"]);
      expect(mockSub1.unsubscribe).toHaveBeenCalledTimes(1);
      expect(mockSub2.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("stop", () => {
    it("should call drain on the connection", async () => {
      await client.subscribe(["topic1"]);
      client.stop();
      expect(mockNc.drain).toHaveBeenCalledTimes(1);
    });

    it("should not throw if called before any connection is established", () => {
      expect(() => client.stop()).not.toThrow();
      expect(mockNc.drain).not.toHaveBeenCalled();
    });
  });

  describe("setOnMessageHandler", () => {
    it("should update callback used in future subscription callbacks", async () => {
      const onMessage1 = jest.fn();
      const onMessage2 = jest.fn();

      client.setOnMessageHandler(onMessage1);
      await client.subscribe(["topic1"]);
      client.setOnMessageHandler(onMessage2);

      const subscribeCall = mockNc.subscribe.mock.calls[0] as [
        string,
        { callback: (err: null, msg: unknown) => void },
      ];
      const callback = subscribeCall[1].callback;
      const testData = { v: 1 };
      callback(null, {
        subject: "topic1",
        data: Buffer.from(JSON.stringify(testData)),
        headers: { get: () => "deflate+json" },
      });

      // The closure captures `this.onMessageCallback` at call time, so onMessage2 should be called
      expect(onMessage1).not.toHaveBeenCalled();
      expect(onMessage2).toHaveBeenCalledWith("topic1", testData, null, client);
    });
  });
});

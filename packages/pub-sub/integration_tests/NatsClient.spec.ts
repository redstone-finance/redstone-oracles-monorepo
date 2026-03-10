import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { NatsClient } from "../src/NatsClient";

/**
 * Set NATS_INTEGRATION_HOST=localhost:4222 to enable these tests.
 * In CI a NATS service container is started automatically by the workflow.
 */
const NATS_HOST = RedstoneCommon.getFromEnv("NATS_INTEGRATION_HOST", z.string().optional());
const PUBLISH_WAIT_MS = 100;

const describeIfEnabled = NATS_HOST ? describe : describe.skip;

// All topics use MQTT-style conventions (/ separator, + and # wildcards)
// NatsClient translates them to NATS subjects internally
describeIfEnabled("NatsClient integration", () => {
  let publisher: NatsClient;
  let subscriber: NatsClient;

  beforeEach(() => {
    publisher = new NatsClient({ host: NATS_HOST! });
    subscriber = new NatsClient({ host: NATS_HOST! });
  });

  afterEach(() => {
    publisher.stop();
    subscriber.stop();
  });

  it("should publish and receive a message on a subscribed topic", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["data-package/redstone-primary/BTC"]);

    await publisher.publish(
      [{ topic: "data-package/redstone-primary/BTC", data: { price: 42 } }],
      "deflate+json"
    );
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      "data-package/redstone-primary/BTC",
      { price: 42 },
      null,
      subscriber
    );
  });

  it("should not receive messages on unsubscribed topics", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["feed/subscribed"]);

    await publisher.publish(
      [
        { topic: "feed/subscribed", data: "yes" },
        { topic: "feed/other", data: "no" },
      ],
      "deflate+json"
    );
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("feed/subscribed", "yes", null, subscriber);
  });

  it("should stop receiving messages after unsubscribe", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["feed/unsub"]);

    await publisher.publish([{ topic: "feed/unsub", data: 1 }], "deflate+json");
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);
    expect(onMessage).toHaveBeenCalledTimes(1);
    onMessage.mockClear();

    await subscriber.unsubscribe(["feed/unsub"]);

    await publisher.publish([{ topic: "feed/unsub", data: 2 }], "deflate+json");
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);
    expect(onMessage).toHaveBeenCalledTimes(0);
  });

  it("should handle multiple subscribers on the same topic", async () => {
    const onMessage1 = jest.fn();
    const onMessage2 = jest.fn();
    const subscriber2 = new NatsClient({ host: NATS_HOST! });

    subscriber.setOnMessageHandler(onMessage1);
    subscriber2.setOnMessageHandler(onMessage2);

    await subscriber.subscribe(["feed/shared"]);
    await subscriber2.subscribe(["feed/shared"]);

    await publisher.publish([{ topic: "feed/shared", data: { v: 99 } }], "deflate+json");
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage1).toHaveBeenCalledWith("feed/shared", { v: 99 }, null, subscriber);
    expect(onMessage2).toHaveBeenCalledWith("feed/shared", { v: 99 }, null, subscriber2);

    subscriber2.stop();
  });

  it("should handle publishing multiple payloads in one call", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["multi/a", "multi/b", "multi/c"]);

    await publisher.publish(
      [
        { topic: "multi/a", data: "A" },
        { topic: "multi/b", data: "B" },
        { topic: "multi/c", data: "C" },
      ],
      "deflate+json"
    );
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage).toHaveBeenCalledTimes(3);
    expect(onMessage).toHaveBeenCalledWith("multi/a", "A", null, subscriber);
    expect(onMessage).toHaveBeenCalledWith("multi/b", "B", null, subscriber);
    expect(onMessage).toHaveBeenCalledWith("multi/c", "C", null, subscriber);
  });

  it("should support both deflate+json and gzip+json content types", async () => {
    const onMessageDeflate = jest.fn();
    const onMessageGzip = jest.fn();
    const gzipSubscriber = new NatsClient({ host: NATS_HOST! });

    subscriber.setOnMessageHandler(onMessageDeflate);
    gzipSubscriber.setOnMessageHandler(onMessageGzip);

    await subscriber.subscribe(["ct/deflate"]);
    await gzipSubscriber.subscribe(["ct/gzip"]);

    await publisher.publish([{ topic: "ct/deflate", data: { ct: "deflate" } }], "deflate+json");
    await publisher.publish([{ topic: "ct/gzip", data: { ct: "gzip" } }], "gzip+json");
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessageDeflate).toHaveBeenCalledWith(
      "ct/deflate",
      { ct: "deflate" },
      null,
      subscriber
    );
    expect(onMessageGzip).toHaveBeenCalledWith("ct/gzip", { ct: "gzip" }, null, gzipSubscriber);

    gzipSubscriber.stop();
  });

  it("should support MQTT single-level wildcard +", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["data-package/redstone-primary/+/0xabc"]);

    await publisher.publish(
      [
        { topic: "data-package/redstone-primary/BTC/0xabc", data: 1 },
        { topic: "data-package/redstone-primary/ETH/0xabc", data: 2 },
        // different node address — should NOT match
        { topic: "data-package/redstone-primary/BTC/0xdef", data: 3 },
      ],
      "deflate+json"
    );
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith(
      "data-package/redstone-primary/BTC/0xabc",
      1,
      null,
      subscriber
    );
    expect(onMessage).toHaveBeenCalledWith(
      "data-package/redstone-primary/ETH/0xabc",
      2,
      null,
      subscriber
    );
  });

  it("should support MQTT multi-level wildcard #", async () => {
    const onMessage = jest.fn();
    subscriber.setOnMessageHandler(onMessage);
    await subscriber.subscribe(["data-package/redstone-primary/#"]);

    await publisher.publish(
      [
        { topic: "data-package/redstone-primary/BTC/0xabc", data: 1 },
        { topic: "data-package/redstone-primary/ETH/0xdef", data: 2 },
        // different service — should NOT match
        { topic: "data-package/redstone-fallback/BTC/0xabc", data: 3 },
      ],
      "deflate+json"
    );
    await RedstoneCommon.sleep(PUBLISH_WAIT_MS);

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith(
      "data-package/redstone-primary/BTC/0xabc",
      1,
      null,
      subscriber
    );
    expect(onMessage).toHaveBeenCalledWith(
      "data-package/redstone-primary/ETH/0xdef",
      2,
      null,
      subscriber
    );
  });
});

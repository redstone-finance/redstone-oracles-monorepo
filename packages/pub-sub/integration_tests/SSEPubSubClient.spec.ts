import { RedstoneCommon } from "@redstone-finance/utils";
import { ChildProcess, execSync, spawn } from "node:child_process";
import { SSEPubSubClient } from "../src";

const GATEWAY_DIR = "../light-gateway";
const GATEWAY_ADDRESS = "http://localhost:3000";
const PUBLISH_WAIT = 100; // Time to wait for publish to propagate

// Times to keep gateway down before reconnecting
const SHORT_DISCONNECT_TIME = 5_000;
const LONG_DISCONNECT_TIME = 60_000;

async function runGateway(): Promise<ChildProcess> {
  const proc = spawn("cargo", ["run", "--release"], {
    cwd: GATEWAY_DIR,
    env: { ...process.env, RUST_LOG: "info" },
  });

  // Wait for gateway to start
  let started = false as boolean;
  proc.stdout.on("data", (data: string) => {
    if (data.toString().includes('"message":"server listening"')) {
      started = true;
    }
  });
  for (let i = 0; !started && i < 30; i++) {
    await RedstoneCommon.sleep(100);
  }

  return proc;
}

async function killGateway(proc: ChildProcess) {
  proc.kill();
  for (let i = 0; !proc.killed && i < 100; i++) {
    await RedstoneCommon.sleep(100);
  }
  if (!proc.killed) {
    proc.kill("SIGKILL");
  }
}

describe("SSEPubSubClient", () => {
  let gatewayProc: ChildProcess;
  let client: SSEPubSubClient;
  let client1: SSEPubSubClient;
  let client2: SSEPubSubClient;

  beforeAll(async () => {
    execSync("cargo build --release", { cwd: GATEWAY_DIR });
    gatewayProc = await runGateway();
  });

  afterAll(async () => {
    await killGateway(gatewayProc);
  });

  beforeEach(async () => {
    client = client1 = new SSEPubSubClient(GATEWAY_ADDRESS);
    client1.start();

    client2 = new SSEPubSubClient(GATEWAY_ADDRESS);
    client2.start();

    // Wait for "connected" events
    const connected = () =>
      client1["sessionId"] !== undefined && client2["sessionId"] !== undefined;
    for (let i = 0; !connected() && i < 30; i++) {
      await RedstoneCommon.sleep(100);
    }
  });

  afterEach(() => {
    client1.stop();
    client2.stop();
  });

  it("should initialize session id", () => {
    expect(client["sessionId"]).toBeTruthy();
  });

  it("should receive only and all data subscribed for", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1", "topic2"], onMessage);

    await client.publish([{ topic: "topic1", data: 123 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    onMessage.mockClear();

    await client.publish([
      { topic: "topic1", data: 123 },
      { topic: "topic3", data: 999 },
      { topic: "topic2", data: 321 },
    ]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    expect(onMessage).toHaveBeenCalledWith("topic2", 321, null, client);
    onMessage.mockClear();

    await client.publish([
      { topic: "topic3", data: 123 },
      { topic: "topic3", data: 321 },
      { topic: "topic4", data: 999 },
    ]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);
    expect(onMessage).toHaveBeenCalledTimes(0);
  });

  it("should handle multiple clients properly", async () => {
    const onMessage1 = jest.fn();
    await client1.subscribe(["topic1", "topic2"], onMessage1);

    const onMessage2 = jest.fn();
    await client2.subscribe(["topic2", "topic3"], onMessage2);

    await Promise.all([
      client1.publish([{ topic: "topic1", data: "data1" }]),
      client2.publish([{ topic: "topic2", data: "data2" }]),
      client2.publish([
        { topic: "topic2", data: "data3" },
        { topic: "topic1", data: "data4" },
      ]),
      client1.publish([
        { topic: "topic3", data: "data5" },
        { topic: "topic4", data: "data6" },
      ]),
    ]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage1).toHaveBeenCalledTimes(4);
    expect(onMessage1).toHaveBeenCalledWith("topic1", "data1", null, client1);
    expect(onMessage1).toHaveBeenCalledWith("topic2", "data2", null, client1);
    expect(onMessage1).toHaveBeenCalledWith("topic2", "data3", null, client1);
    expect(onMessage1).toHaveBeenCalledWith("topic1", "data4", null, client1);

    expect(onMessage2).toHaveBeenCalledTimes(3);
    expect(onMessage2).toHaveBeenCalledWith("topic2", "data2", null, client2);
    expect(onMessage2).toHaveBeenCalledWith("topic2", "data3", null, client2);
    expect(onMessage2).toHaveBeenCalledWith("topic3", "data5", null, client2);
  });

  it("should handle long awaited reconnection", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1"], onMessage);

    await client.publish([{ topic: "topic1", data: 123 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    onMessage.mockClear();

    await killGateway(gatewayProc);

    const result = client.publish([{ topic: "topic1", data: "fail" }]);
    await expect(result).rejects.toMatchObject({ code: "ECONNREFUSED" });

    await RedstoneCommon.sleep(LONG_DISCONNECT_TIME);
    expect(onMessage).toHaveBeenCalledTimes(0);

    const postSpy = jest.spyOn(client["httpClient"], "post");
    postSpy.mockClear();
    gatewayProc = await runGateway();
    await RedstoneCommon.sleep(3_000);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: expect.anything() as string, topics: ["topic1"] },
      expect.anything()
    );

    await client.publish([{ topic: "topic1", data: 321 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 321, null, client);
  });

  it("should handle reconnection with no initial topics", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1"], onMessage);

    await client.publish([{ topic: "topic1", data: 123 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    onMessage.mockClear();

    await killGateway(gatewayProc);

    const result = client.publish([{ topic: "topic1", data: "fail" }]);
    await expect(result).rejects.toMatchObject({ code: "ECONNREFUSED" });

    await RedstoneCommon.sleep(SHORT_DISCONNECT_TIME);
    expect(onMessage).toHaveBeenCalledTimes(0);

    const postSpy = jest.spyOn(client["httpClient"], "post");
    postSpy.mockClear();
    gatewayProc = await runGateway();
    await RedstoneCommon.sleep(3_000);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: expect.anything() as string, topics: ["topic1"] },
      expect.anything()
    );

    await client.publish([{ topic: "topic1", data: 321 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 321, null, client);
  });

  it("should handle reconnection with all initial topics", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1"], onMessage);

    // Start again to set up initialTopics
    client["eventSource"]?.close();
    client.start();
    await RedstoneCommon.sleep(3_000);

    await client.publish([{ topic: "topic1", data: 123 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    onMessage.mockClear();

    await killGateway(gatewayProc);

    const result = client.publish([{ topic: "topic1", data: "fail" }]);
    await expect(result).rejects.toMatchObject({ code: "ECONNREFUSED" });

    await RedstoneCommon.sleep(SHORT_DISCONNECT_TIME);
    expect(onMessage).toHaveBeenCalledTimes(0);

    const postSpy = jest.spyOn(client["httpClient"], "post");
    postSpy.mockClear();
    gatewayProc = await runGateway();
    await RedstoneCommon.sleep(3_000);
    expect(postSpy).toHaveBeenCalledTimes(0);

    await client.publish([{ topic: "topic1", data: 321 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 321, null, client);
  });

  it("should handle reconnection with some initial topics", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1", "topic2"], onMessage);

    // Start again to set up initialTopics
    client["eventSource"]?.close();
    client.start();
    await RedstoneCommon.sleep(3_000);

    await client.subscribe(["topic3"], onMessage);
    await client.unsubscribe(["topic2"]);

    await client.publish([{ topic: "topic1", data: 123 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 123, null, client);
    onMessage.mockClear();

    await killGateway(gatewayProc);

    const result = client.publish([{ topic: "topic1", data: "fail" }]);
    await expect(result).rejects.toMatchObject({ code: "ECONNREFUSED" });

    await RedstoneCommon.sleep(SHORT_DISCONNECT_TIME);
    expect(onMessage).toHaveBeenCalledTimes(0);

    const postSpy = jest.spyOn(client["httpClient"], "post");
    postSpy.mockClear();
    gatewayProc = await runGateway();
    await RedstoneCommon.sleep(3_000);
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/subscribe_to_topics`,
      { session_id: expect.anything() as string, topics: ["topic3"] },
      expect.anything()
    );
    expect(postSpy).toHaveBeenCalledWith(
      `${GATEWAY_ADDRESS}/unsubscribe_from_topics`,
      { session_id: expect.anything() as string, topics: ["topic2"] },
      expect.anything()
    );

    await client.publish([{ topic: "topic1", data: 321 }]);
    await RedstoneCommon.sleep(PUBLISH_WAIT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("topic1", 321, null, client);
  });

  it("should handle many fast reconnections", async () => {
    const onMessage = jest.fn();
    await client.subscribe(["topic1"], onMessage);

    for (let i = 0; i < 10; i++) {
      await client.publish([{ topic: "topic1", data: i }]);
      await RedstoneCommon.sleep(PUBLISH_WAIT);

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith("topic1", i, null, client);
      onMessage.mockClear();

      await killGateway(gatewayProc);

      const result = client.publish([{ topic: "topic1", data: "fail" }]);
      await expect(result).rejects.toMatchObject({ code: "ECONNREFUSED" });

      const disconnect_time = Math.floor(Math.random() * SHORT_DISCONNECT_TIME);
      await RedstoneCommon.sleep(disconnect_time);
      expect(onMessage).toHaveBeenCalledTimes(0);

      gatewayProc = await runGateway();
      await RedstoneCommon.sleep(3_000);
    }
  });
});

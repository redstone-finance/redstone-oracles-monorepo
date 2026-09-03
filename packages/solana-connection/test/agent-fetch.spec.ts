import { RedstoneCommon } from "@redstone-finance/utils";
import { Agent, createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { makeAgentFetch } from "../src/agent-fetch";

const RESPONSE_STATUS = 418;
const RESPONSE_HEADER = "x-redstone-test";
const HOLD = "hold";
const GZIP = "gzip";
const POLL_INTERVAL_MS = 10;
const POLL_LIMIT = 200;

describe("makeAgentFetch", () => {
  let server: Server;
  let agent: Agent;
  let url: string;
  let received: {
    method: string;
    body: string;
    contentType?: string;
    acceptEncoding?: string;
  }[];

  beforeEach(async () => {
    received = [];
    server = createServer((request: IncomingMessage, response: ServerResponse) => {
      void readBody(request).then((body) => {
        received.push({
          method: request.method!,
          body,
          contentType: request.headers["content-type"],
          acceptEncoding: request.headers["accept-encoding"],
        });
        if (body === HOLD) {
          return;
        }
        if (body === GZIP) {
          response.writeHead(RESPONSE_STATUS, {
            [RESPONSE_HEADER]: "yes",
            "content-encoding": "gzip",
          });
          response.end(gzipSync(Buffer.from(`answer ${GZIP}`)));

          return;
        }
        response.writeHead(RESPONSE_STATUS, { [RESPONSE_HEADER]: "yes" });
        response.end(`answer ${received.length}`);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/rpc`;
    agent = new Agent({ keepAlive: true, maxSockets: 4 });
  });

  afterEach(async () => {
    agent.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("sends the request through the given agent", async () => {
    const createConnection = jest.spyOn(agent, "createConnection");

    const response = await makeAgentFetch(agent)(url, {
      method: "POST",
      body: '{"method":"getSlot"}',
      headers: { "Content-Type": "application/json" },
    });

    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(received).toEqual([
      {
        method: "POST",
        body: '{"method":"getSlot"}',
        contentType: "application/json",
        acceptEncoding: "gzip, deflate, br",
      },
    ]);
    expect(response.status).toBe(RESPONSE_STATUS);
    expect(response.headers.get(RESPONSE_HEADER)).toBe("yes");
    expect(await response.text()).toBe("answer 1");
  });

  it("reuses the socket of the agent for a second request", async () => {
    const createConnection = jest.spyOn(agent, "createConnection");
    const reuseSocket = jest.spyOn(agent, "reuseSocket");
    const fetchThroughAgent = makeAgentFetch(agent);

    await fetchThroughAgent(url, { method: "POST", body: "one" });
    await fetchThroughAgent(url, { method: "POST", body: "two" });

    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(reuseSocket).toHaveBeenCalledTimes(1);
    expect(received.map(({ body }) => body)).toEqual(["one", "two"]);
  });

  it("makes no request when the signal is already aborted", async () => {
    const createConnection = jest.spyOn(agent, "createConnection");
    const controller = new AbortController();
    controller.abort(new Error("gone before it started"));

    await expect(
      makeAgentFetch(agent)(url, { method: "POST", body: "one", signal: controller.signal })
    ).rejects.toThrow("gone before it started");
    expect(createConnection).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });

  it("destroys the socket of a request aborted in flight", async () => {
    const controller = new AbortController();
    const pending = makeAgentFetch(agent)(url, {
      method: "POST",
      body: HOLD,
      signal: controller.signal,
    });
    await waitForRequest();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await waitForReleasedSockets();
    expect(Object.keys(agent.sockets)).toEqual([]);
  });

  it("leaves out an agent that does not match the protocol", async () => {
    const tlsAgent = new HttpsAgent({ keepAlive: true });
    const createConnection = jest.spyOn(tlsAgent, "createConnection");

    const response = await makeAgentFetch(tlsAgent)(url, { method: "POST", body: "one" });

    expect(createConnection).not.toHaveBeenCalled();
    expect(response.status).toBe(RESPONSE_STATUS);
    expect(received.map(({ body }) => body)).toEqual(["one"]);
    tlsAgent.destroy();
  });

  it("asks for compression, unpacks a gzipped response and drops the headers of the packed one", async () => {
    const response = await makeAgentFetch(agent)(url, { method: "POST", body: GZIP });

    expect(received[0].acceptEncoding).toContain("gzip");
    expect(await response.text()).toBe(`answer ${GZIP}`);
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get(RESPONSE_HEADER)).toBe("yes");
  });

  it("rejects a body it cannot send", async () => {
    await expect(
      makeAgentFetch(agent)(url, { method: "POST", body: new ArrayBuffer(8) })
    ).rejects.toThrow("agent fetch supports only string bodies");
  });

  function waitForRequest() {
    return RedstoneCommon.waitForSuccess(
      () => Promise.resolve(received.length > 0),
      POLL_LIMIT,
      "the server never got the request",
      POLL_INTERVAL_MS
    );
  }

  function waitForReleasedSockets() {
    return RedstoneCommon.waitForSuccess(
      () => Promise.resolve(Object.keys(agent.sockets).length === 0),
      POLL_LIMIT,
      "the aborted socket stayed in the pool",
      POLL_INTERVAL_MS
    );
  }
});

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => resolve(body));
  });
}

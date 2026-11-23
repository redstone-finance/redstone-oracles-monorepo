import { RedstoneCommon } from "@redstone-finance/utils";
import { FetchFn } from "@solana/web3.js";
import { Agent as HttpAgent, IncomingMessage, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { gunzipSync } from "node:zlib";

const ACCEPT_ENCODING = "gzip";
const DECODED_ENCODINGS = ["gzip", "x-gzip"];
const DECODED_AWAY_HEADERS = ["content-encoding", "content-length"];
export const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

export function makeAgentFetch(
  agent: HttpAgent | HttpsAgent,
  maxResponseBytes = MAX_RESPONSE_BYTES
): FetchFn {
  return (input, init) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(abortError(signal));

        return;
      }
      const url = parseUrl(input);
      const overTls = url.protocol === "https:";
      const send = overTls ? httpsRequest : httpRequest;
      const request = send(
        url,
        {
          agent: overTls === agent instanceof HttpsAgent ? agent : undefined,
          method: init?.method ?? "GET",
          headers: {
            "accept-encoding": ACCEPT_ENCODING,
            ...Object.fromEntries(new Headers(init?.headers)),
          },
        },
        (response) => {
          response.on("error", reject);
          readResponseBody(response, maxResponseBytes).then(
            (body) =>
              resolve(
                new Response(body, {
                  status: response.statusCode,
                  statusText: response.statusMessage,
                  headers: readResponseHeaders(response),
                })
              ),
            reject
          );
        }
      );
      request.on("error", reject);
      const abort = () => {
        request.destroy();
        reject(abortError(signal!));
      };
      signal?.addEventListener("abort", abort, { once: true });
      request.once("close", () => signal?.removeEventListener("abort", abort));
      request.end(readBody(init));
    });
}

function abortError(signal: AbortSignal) {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }
  const error = new Error(String(signal.reason ?? "aborted"));
  error.name = "AbortError";

  return error;
}

function parseUrl(input: Parameters<FetchFn>[0]) {
  if (typeof input === "string") {
    return new URL(input);
  }

  return input instanceof URL ? input : new URL(input.url);
}

function readBody(init?: RequestInit) {
  if (!RedstoneCommon.isDefined(init?.body)) {
    return undefined;
  }
  if (typeof init.body === "string") {
    return init.body;
  }

  throw new Error(`agent fetch supports only string bodies, got ${typeof init.body}`);
}

async function readResponseBody(response: IncomingMessage, maxResponseBytes: number) {
  const encoding = contentEncoding(response);
  if (encoding !== "identity" && !DECODED_ENCODINGS.includes(encoding)) {
    response.destroy();

    throw new Error(`Unsupported content-encoding: ${encoding}`);
  }
  const raw = await collectResponseBody(response, maxResponseBytes);
  if (!raw || encoding === "identity") {
    return raw;
  }

  return gunzipSync(raw, { maxOutputLength: maxResponseBytes });
}

function contentEncoding(response: IncomingMessage) {
  const encoding = String(response.headers["content-encoding"] ?? "identity")
    .trim()
    .toLowerCase();

  return encoding === "" ? "identity" : encoding;
}

function isDecoded(response: IncomingMessage) {
  return DECODED_ENCODINGS.includes(contentEncoding(response));
}

function collectResponseBody(body: Readable, maxResponseBytes: number) {
  return new Promise<Buffer | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    body.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxResponseBytes) {
        body.destroy(new Error(`Response body exceeds ${maxResponseBytes} bytes`));

        return;
      }
      chunks.push(chunk);
    });
    body.on("error", reject);
    body.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : null));
  });
}

function readResponseHeaders(response: IncomingMessage) {
  const dropped = isDecoded(response) ? DECODED_AWAY_HEADERS : [];

  return new Headers(
    Object.entries(response.headers)
      .filter(([name]) => !dropped.includes(name))
      .flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value])
          .filter(RedstoneCommon.isDefined)
          .map((single) => <[string, string]>[name, single])
      )
  );
}

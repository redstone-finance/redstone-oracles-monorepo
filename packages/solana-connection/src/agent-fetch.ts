import { RedstoneCommon } from "@redstone-finance/utils";
import { FetchFn } from "@solana/web3.js";
import { Agent as HttpAgent, IncomingMessage, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

const ACCEPT_ENCODING = "gzip, deflate, br";
const DECODED_ENCODINGS = ["gzip", "deflate", "br"];
const DECODED_AWAY_HEADERS = ["content-encoding", "content-length"];

export function makeAgentFetch(agent: HttpAgent | HttpsAgent): FetchFn {
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
          collectResponseBody(decodeResponse(response)).then(
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

function decodeResponse(response: IncomingMessage) {
  switch (response.headers["content-encoding"]) {
    case "gzip":
      return response.pipe(createGunzip());
    case "deflate":
      return response.pipe(createInflate());
    case "br":
      return response.pipe(createBrotliDecompress());
    default:
      return response;
  }
}

function isDecoded(response: IncomingMessage) {
  return DECODED_ENCODINGS.includes(String(response.headers["content-encoding"]));
}

function collectResponseBody(body: Readable) {
  return new Promise<Buffer | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    body.on("data", (chunk: Buffer) => chunks.push(chunk));
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

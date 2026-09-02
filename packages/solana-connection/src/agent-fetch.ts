import { RedstoneCommon } from "@redstone-finance/utils";
import { FetchFn } from "@solana/web3.js";
import { Agent as HttpAgent, IncomingMessage, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";

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
          headers: Object.fromEntries(new Headers(init?.headers)),
        },
        (response) => {
          response.on("error", reject);
          collectResponseBody(response).then(
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

function collectResponseBody(response: IncomingMessage) {
  return new Promise<Buffer | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    response.on("data", (chunk: Buffer) => chunks.push(chunk));
    response.on("error", reject);
    response.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : null));
  });
}

function readResponseHeaders(response: IncomingMessage) {
  return new Headers(
    Object.entries(response.headers).flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter(RedstoneCommon.isDefined)
        .map((single) => <[string, string]>[name, single])
    )
  );
}

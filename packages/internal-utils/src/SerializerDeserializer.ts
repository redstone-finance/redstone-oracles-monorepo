import { promisify } from "util";
import {
  deflate,
  deflateSync,
  gunzip,
  gunzipSync,
  gzip,
  gzipSync,
  inflate,
  inflateSync,
} from "zlib";
import { z } from "zod";

export const ContentTypesEnum = z.enum(["deflate+json", "gzip+json"]);

export type ContentTypes = z.infer<typeof ContentTypesEnum>;

interface SerializerDeserializer {
  serialize<T = unknown>(data: T): Buffer;
  deserialize<T = unknown>(buffer: Buffer): T;
  serializeAsync<T = unknown>(data: T): Promise<Buffer>;
  deserializeAsync<T = unknown>(buffer: Buffer): Promise<T>;
}

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export class GZipJson implements SerializerDeserializer {
  serialize<T = unknown>(data: T): Buffer {
    return gzipSync(JSON.stringify(data));
  }

  deserialize<T = unknown>(buffer: Buffer): T {
    return JSON.parse(gunzipSync(buffer).toString("utf-8")) as T;
  }

  async serializeAsync<T = unknown>(data: T): Promise<Buffer> {
    return await gzipAsync(JSON.stringify(data));
  }

  async deserializeAsync<T = unknown>(buffer: Buffer): Promise<T> {
    const unzipped = await gunzipAsync(buffer);
    return JSON.parse(unzipped.toString("utf-8")) as T;
  }
}

// if the payloads are bigger than 1KB we should use async version
export class DeflateJson implements SerializerDeserializer {
  serialize<T = unknown>(data: T): Buffer {
    return deflateSync(JSON.stringify(data));
  }

  deserialize<T = unknown>(buffer: Buffer): T {
    return JSON.parse(inflateSync(buffer).toString("utf-8")) as T;
  }

  async serializeAsync<T = unknown>(data: T): Promise<Buffer> {
    return await deflateAsync(JSON.stringify(data));
  }

  async deserializeAsync<T = unknown>(buffer: Buffer): Promise<T> {
    const inflated = await inflateAsync(buffer);
    return JSON.parse(inflated.toString("utf-8")) as T;
  }
}

export const SerializerDeserializerRegistry: Record<
  ContentTypes,
  SerializerDeserializer | undefined
> = {
  "deflate+json": new DeflateJson(),
  "gzip+json": new GZipJson(),
};

export const SerializerDeserializerContentEncoding: Record<ContentTypes, string> = {
  "deflate+json": "deflate",
  "gzip+json": "gzip",
};

export function getContentEncoding(name: ContentTypes) {
  const contentEncoding = SerializerDeserializerContentEncoding[name];

  if (!contentEncoding) {
    throw new Error(`SerializerDeserializer for ${name} is not implemented`);
  }

  return contentEncoding;
}

export function getSerializerDeserializer(name: ContentTypes) {
  const serializerDeserializer = SerializerDeserializerRegistry[name];

  if (!serializerDeserializer) {
    throw new Error(`SerializerDeserializer for ${name} is not implemented`);
  }

  return serializerDeserializer;
}

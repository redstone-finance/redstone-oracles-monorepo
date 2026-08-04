import { arrayify, BytesLike, hexlify } from "./hex";

const TRAILING_NULLS_REGEXP = /\0+$/;
const BYTES32_LENGTH = 32;
const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder();

export function toUtf8Bytes(text: string) {
  return UTF8_ENCODER.encode(text);
}

export function toUtf8String(value: BytesLike) {
  return UTF8_DECODER.decode(arrayify(value));
}

export function parseBytes32String(value: BytesLike) {
  return toUtf8String(value).replace(TRAILING_NULLS_REGEXP, "");
}

export function formatBytes32String(text: string) {
  const bytes = toUtf8Bytes(text);
  if (bytes.length >= BYTES32_LENGTH) {
    throw new Error(`bytes32 string must be less than 32 bytes: ${text}`);
  }

  const padded = new Uint8Array(BYTES32_LENGTH);
  padded.set(bytes);

  return hexlify(padded);
}

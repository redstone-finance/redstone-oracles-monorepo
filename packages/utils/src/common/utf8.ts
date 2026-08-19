import { arrayify, BytesLike, hexlify } from "./hex";

const BYTES32_LENGTH = 32;
const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export function toUtf8Bytes(text: string) {
  return UTF8_ENCODER.encode(text);
}

export function toUtf8String(value: BytesLike) {
  return UTF8_DECODER.decode(arrayify(value));
}

export function parseBytes32String(value: BytesLike) {
  const bytes = arrayify(value);
  if (bytes.length !== BYTES32_LENGTH) {
    throw new Error(`invalid bytes32 - not ${BYTES32_LENGTH} bytes long: ${hexlify(bytes)}`);
  }
  if (bytes[BYTES32_LENGTH - 1] !== 0) {
    throw new Error(`invalid bytes32 string - no null terminator: ${hexlify(bytes)}`);
  }

  let length = BYTES32_LENGTH - 1;
  while (bytes[length - 1] === 0) {
    length--;
  }

  return toUtf8String(bytes.slice(0, length));
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

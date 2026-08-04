import { arrayify, BytesLike } from "@ethersproject/bytes";

const hasBuffer = typeof Buffer !== "undefined";

export function encodeBase64(value: BytesLike) {
  const bytes = arrayify(value);

  return hasBuffer ? Buffer.from(bytes).toString("base64") : btoa(toLatin1(bytes));
}

export function decodeBase64(value: string) {
  return hasBuffer ? Uint8Array.from(Buffer.from(value, "base64")) : fromLatin1(atob(value));
}

function toLatin1(bytes: Uint8Array) {
  let latin1 = "";
  for (const byte of bytes) {
    latin1 += String.fromCharCode(byte);
  }

  return latin1;
}

function fromLatin1(latin1: string) {
  const bytes = new Uint8Array(latin1.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = latin1.charCodeAt(i);
  }

  return bytes;
}

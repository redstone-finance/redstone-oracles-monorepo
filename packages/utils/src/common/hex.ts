const HEX_CHARS_REGEXP = /^(0x)?[0-9a-f]+$/i;
const HEX_PREFIX_REGEXP = /^0x/i;

export type BytesLike = string | ArrayLike<number>;

export function isHexString(value: string) {
  return HEX_CHARS_REGEXP.test(value) && stripHexPrefix(value).length % 2 === 0;
}

export function arrayify(value: BytesLike) {
  if (typeof value !== "string") {
    return Uint8Array.from(value);
  }

  if (!HEX_CHARS_REGEXP.test(value)) {
    throw new Error(`Not a hex string: ${value}`);
  }

  const hex = stripHexPrefix(value);
  if (hex.length % 2 !== 0) {
    throw new Error(`hex data is odd-length: ${value}`);
  }

  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function hexlify(value: BytesLike) {
  return `0x${Buffer.from(arrayify(value)).toString("hex")}`;
}

function stripHexPrefix(value: string) {
  return value.replace(HEX_PREFIX_REGEXP, "");
}

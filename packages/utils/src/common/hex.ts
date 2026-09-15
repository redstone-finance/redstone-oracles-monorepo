const HEX_CHARS_REGEXP = /^(0x)?[0-9a-f]+$/i;
const HEX_PREFIX_REGEXP = /^0x/i;
const LEADING_ZEROS_REGEXP = /^0+/;
const HEX_RADIX = 16;
const BYTE_HEX_LENGTH = 2;
const hasBuffer = typeof Buffer !== "undefined";

export type BytesLike = string | ArrayLike<number>;

export function isHexString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    HEX_CHARS_REGEXP.test(value) &&
    stripHexPrefix(value).length % BYTE_HEX_LENGTH === 0
  );
}

export function arrayify(value: BytesLike) {
  if (typeof value !== "string") {
    return Uint8Array.from(value);
  }

  if (!HEX_CHARS_REGEXP.test(value)) {
    throw new Error(`Not a hex string: ${value}`);
  }

  const hex = stripHexPrefix(value);
  if (hex.length % BYTE_HEX_LENGTH !== 0) {
    throw new Error(`hex data is odd-length: ${value}`);
  }

  return hasBuffer ? Uint8Array.from(Buffer.from(hex, "hex")) : bytesFromHex(hex);
}

export function hexlify(value: BytesLike) {
  const bytes = arrayify(value);

  return `0x${hasBuffer ? Buffer.from(bytes).toString("hex") : hexFromBytes(bytes)}`;
}

export function hexDataSlice(value: BytesLike, start: number, end?: number) {
  return hexlify(arrayify(value).slice(start, end));
}

export function hexValue(value: number | bigint | BytesLike) {
  if (typeof value === "number" || typeof value === "bigint") {
    return `0x${value.toString(HEX_RADIX)}`;
  }

  const digits = hexDigits(value).replace(LEADING_ZEROS_REGEXP, "");

  return `0x${digits === "" ? "0" : digits}`;
}

export function hexZeroPad(value: BytesLike, byteLength: number) {
  const digits = hexDigits(value);
  const width = byteLength * BYTE_HEX_LENGTH;
  if (digits.length > width) {
    throw new Error(`Value ${hexValue(value)} does not fit in ${byteLength} bytes`);
  }

  return `0x${digits.padStart(width, "0")}`;
}

function hexDigits(value: BytesLike) {
  if (typeof value !== "string") {
    return stripHexPrefix(hexlify(value));
  }

  if (!HEX_CHARS_REGEXP.test(value)) {
    throw new Error(`Not a hex string: ${value}`);
  }

  return stripHexPrefix(value).toLowerCase();
}

function stripHexPrefix(value: string) {
  return value.replace(HEX_PREFIX_REGEXP, "");
}

function bytesFromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / BYTE_HEX_LENGTH);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(
      hex.substring(i * BYTE_HEX_LENGTH, (i + 1) * BYTE_HEX_LENGTH),
      HEX_RADIX
    );
  }

  return bytes;
}

function hexFromBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(BYTE_HEX_LENGTH, "0")).join(
    ""
  );
}

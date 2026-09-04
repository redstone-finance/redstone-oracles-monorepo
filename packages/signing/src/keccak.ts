import { keccak256 as keccak256Hash } from "js-sha3";

type BytesLike = Uint8Array | string;

const HEX_PREFIX_LENGTH = 2;
const BYTE_HEX_LENGTH = 2;
const HEX_RADIX = 16;

export const keccak256 = (data: BytesLike) =>
  new Uint8Array(keccak256Hash.arrayBuffer(typeof data === "string" ? bytesFromHex(data) : data));

function bytesFromHex(value: string) {
  const hex = value.startsWith("0x") ? value.slice(HEX_PREFIX_LENGTH) : value;
  const bytes = new Uint8Array(hex.length / BYTE_HEX_LENGTH);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(
      hex.substring(index * BYTE_HEX_LENGTH, (index + 1) * BYTE_HEX_LENGTH),
      HEX_RADIX
    );
  }

  return bytes;
}

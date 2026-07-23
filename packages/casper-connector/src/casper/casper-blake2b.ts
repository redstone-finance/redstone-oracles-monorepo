import { arrayify, hexlify } from "@ethersproject/bytes";
import { blake2b } from "@noble/hashes/blake2";

export function casperBlake2b(dataHex: string, withPrefix = false) {
  const hashBytes = blake2b(arrayify(dataHex.startsWith("0x") ? dataHex : "0x" + dataHex), {
    dkLen: 32,
  });

  return (withPrefix ? "0x" : "") + hexlify(hashBytes).substring(2);
}

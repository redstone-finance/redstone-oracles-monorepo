import { blake2b } from "@noble/hashes/blake2";
import { RedstoneCommon } from "@redstone-finance/utils";

export function casperBlake2b(dataHex: string, withPrefix = false) {
  const hashBytes = blake2b(RedstoneCommon.arrayify(dataHex), {
    dkLen: 32,
  });

  return (withPrefix ? "0x" : "") + RedstoneCommon.hexlify(hashBytes).substring(2);
}

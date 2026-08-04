import { AbiCoder, keccak256 } from "ethers-v6";
import { toV6Arg } from "./conversions";

export function hashAbiEncoded(types: string[], values: unknown[]) {
  return keccak256(AbiCoder.defaultAbiCoder().encode(types, values.map(toV6Arg)));
}

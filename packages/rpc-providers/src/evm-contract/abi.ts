import { AbiCoder, FunctionFragment, Interface, keccak256 } from "ethers-v6";
import { toV6Arg } from "./conversions";

export function encodeAbi(types: string[], values: unknown[]) {
  return AbiCoder.defaultAbiCoder().encode(types, values.map(toV6Arg));
}

export function hashAbiEncoded(types: string[], values: unknown[]) {
  return keccak256(encodeAbi(types, values));
}

export function encodeCalldata(functionSignature: string, args: unknown[] = []) {
  const fragment = FunctionFragment.from(functionSignature);

  return new Interface([fragment]).encodeFunctionData(fragment.name, args.map(toV6Arg));
}

import { z } from "zod";

export const NonEvmChainTypeSchema = z.enum([
  "sui",
  "movement",
  "radix",
  "fuel",
]);
export const ChainTypeSchema = z.enum([
  "evm",
  ...NonEvmChainTypeSchema.options,
]);
export type ChainType = z.infer<typeof ChainTypeSchema>;

export function isEvmChainType(chainType?: string) {
  return !chainType || chainType === "evm";
}

export function makeRpcUrlsSsmKey(chainId: number, chainType?: ChainType) {
  return isEvmChainType(chainType) ? chainId : `${chainType}/${chainId}`;
}

export function conformsToChainType(left?: ChainType, right?: ChainType) {
  return (left ?? "evm") === (right ?? "evm");
}

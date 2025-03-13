import { z } from "zod";

export const NonEvmChainTypeEnum = z.enum(["sui", "movement", "radix", "fuel"]);
export type NonEvmChainType = z.infer<typeof NonEvmChainTypeEnum>;
export const ChainTypeEnum = z.enum(["evm", ...NonEvmChainTypeEnum.options]);
export type ChainType = z.infer<typeof ChainTypeEnum>;

export function isEvmChainType(
  chainType?: string
): chainType is Exclude<ChainType, NonEvmChainType> {
  return !chainType || chainType === "evm";
}

export function isNonEvmChainType(
  chainType?: string
): chainType is NonEvmChainType {
  return !isEvmChainType(chainType);
}

export function makeRpcUrlsSsmKey(chainId: number, chainType?: ChainType) {
  return isEvmChainType(chainType) ? chainId : `${chainType}/${chainId}`;
}

export function conformsToChainType(left?: ChainType, right?: ChainType) {
  return (left ?? "evm") === (right ?? "evm");
}

import { z } from "zod";
import { NetworkId } from "./schemas";

export const NonEvmChainTypeEnum = z.enum([
  "sui",
  "movement",
  "radix",
  "solana",
  "fuel",
]);

export type NonEvmChainType = z.infer<typeof NonEvmChainTypeEnum>;
export const ChainTypeEnum = z.enum(["evm", ...NonEvmChainTypeEnum.options]);
export type ChainType = z.infer<typeof ChainTypeEnum>;

export function isEvmNetworkId(networkId: NetworkId): networkId is number {
  return typeof networkId === "number";
}

export function isEvmChainType(
  chainType?: string
): chainType is Exclude<ChainType, NonEvmChainType> {
  return !chainType || chainType === ChainTypeEnum.Enum.evm;
}

export function isNonEvmNetworkId(
  networkId: NetworkId
): networkId is `${NonEvmChainType}/${number}` {
  return !isEvmNetworkId(networkId);
}

export function isNonEvmChainType(
  chainType?: string
): chainType is NonEvmChainType {
  return !isEvmChainType(chainType);
}

export function conformsToChainType(left?: ChainType, right?: ChainType) {
  return (left ?? ChainTypeEnum.Enum.evm) === (right ?? ChainTypeEnum.Enum.evm);
}

export function deconstructNetworkId(networkId: NetworkId): {
  chainId: number;
  chainType: ChainType;
} {
  if (typeof networkId === "number") {
    return {
      chainType: ChainTypeEnum.Enum.evm,
      chainId: networkId,
    };
  }

  const [chainTypeStr, chainIdStr] = networkId.split("/");

  const chainType = NonEvmChainTypeEnum.parse(chainTypeStr);

  const chainId = Number(chainIdStr);
  if (Number.isNaN(chainId) || chainId < 1) {
    throw new Error(`Invalid chainId in networkId: ${chainIdStr}`);
  }

  return { chainType, chainId };
}

export function constructNetworkId(
  chainId: number,
  chainType?: ChainType
): NetworkId {
  if (!chainType || chainType === ChainTypeEnum.Enum.evm) {
    return chainId;
  }

  return `${chainType}/${chainId}`;
}

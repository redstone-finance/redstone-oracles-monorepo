import { BlockTag } from "@ethersproject/abstract-provider";
import { TelemetryPoint } from "@redstone-finance/internal-utils";
import { HARDHAT_CHAIN_ID, MathUtils, NetworkId } from "@redstone-finance/utils";
import { providers } from "ethers";
import { RedstoneEthers5Provider } from "./providers/RedstoneProvider";

export type ReportMetricFn = (message: TelemetryPoint) => void;
export type ContractCallOverrides = { blockTag: BlockTag };

/** Assumes that if blockTag is string the it is hex string */
export const convertBlockTagToNumber = (blockTag: BlockTag): number =>
  typeof blockTag === "string" ? convertHexToNumber(blockTag) : blockTag;

export const convertHexToNumber = (hex: string): number => {
  const number = Number.parseInt(hex, 16);
  if (Number.isNaN(number)) {
    throw new Error(`Failed to parse ${hex} to number`);
  }

  return number;
};

export function getProviderNetworkInfo(
  provider: providers.Provider,
  defaultVal = { chainId: HARDHAT_CHAIN_ID, url: "unknown" }
) {
  try {
    if (provider instanceof providers.JsonRpcProvider) {
      return {
        chainId: provider.network.chainId,
        url: provider.connection.url,
      };
    }
    if (provider instanceof RedstoneEthers5Provider) {
      return {
        chainId: provider.network.chainId,
        url: provider.rpc.url,
      };
    }
  } catch {
    /* This happens in mocha tests...*/
    return defaultVal;
  }

  return defaultVal;
}

/** In fact it is sync function cause our provider has static assigned network id */
export async function getProviderNetworkId(provider: providers.Provider): Promise<NetworkId> {
  const network = await provider.getNetwork();

  return network.chainId;
}

export function electRoundedMedian(values: number[]) {
  return Math.round(MathUtils.getMedian(values));
}

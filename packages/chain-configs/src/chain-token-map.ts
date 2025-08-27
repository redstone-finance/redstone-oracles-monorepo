import {
  readJsonFile,
  terminateWithRemoteConfigError,
} from "@redstone-finance/internal-utils";
import { RedstoneRemoteConfig } from "@redstone-finance/remote-config";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ChainTokenMapSchema, type SupportedNetworkNames } from "./schemas";

export type TokenMap = {
  [symbol: string]: {
    address: string;
    decimals: number;
  };
};

export type ChainTokenMap = {
  [networkName in SupportedNetworkNames]?: TokenMap;
};

let chainTokenMap: ChainTokenMap | null = null;

function readAndValidateChainTokenMapConfig(): ChainTokenMap {
  if (!chainTokenMap) {
    try {
      const chainTokenMapConfigPath =
        RedstoneRemoteConfig.findNodeRemoteConfigOrThrow();
      const config = readJsonFile<ChainTokenMap>(
        `${chainTokenMapConfigPath}/chains/chain-token-map.json`
      );
      RedstoneCommon.zodAssert<ChainTokenMap>(ChainTokenMapSchema, config);
      chainTokenMap = config;
    } catch (error) {
      terminateWithRemoteConfigError(RedstoneCommon.stringifyError(error));
    }
  }
  return chainTokenMap;
}

export const getChainTokenMap: () => ChainTokenMap =
  readAndValidateChainTokenMapConfig;

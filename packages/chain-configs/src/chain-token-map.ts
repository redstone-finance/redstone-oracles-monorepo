import {
  findRemoteConfigOrThrow,
  readJsonFile,
  terminateWithNodeRemoteConfigError,
} from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ChainTokenMapSchema } from "./schemas";
import { ChainTokenMap } from "./tokens";

let chainTokenMap: ChainTokenMap | null = null;

function readAndValidateChainTokenMapConfig(): ChainTokenMap {
  if (!chainTokenMap) {
    try {
      const chainTokenMapConfigPath = findRemoteConfigOrThrow();
      const config = readJsonFile<ChainTokenMap>(
        `${chainTokenMapConfigPath}/chains/chain-token-map.json`
      );
      RedstoneCommon.zodAssert<ChainTokenMap>(ChainTokenMapSchema, config);
      chainTokenMap = config;
    } catch (error) {
      terminateWithNodeRemoteConfigError(RedstoneCommon.stringifyError(error));
    }
  }
  return chainTokenMap;
}

export const getChainTokenMap: () => ChainTokenMap =
  readAndValidateChainTokenMapConfig;

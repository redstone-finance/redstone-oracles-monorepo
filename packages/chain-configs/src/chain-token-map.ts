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
    const chainTokenMapConfigPath = findRemoteConfigOrThrow();
    const config = readJsonFile<ChainTokenMap>(
      `${chainTokenMapConfigPath}/chains/chain-token-map.json`
    );
    try {
      RedstoneCommon.zodAssert<ChainTokenMap>(ChainTokenMapSchema, config);
    } catch (error) {
      terminateWithNodeRemoteConfigError(RedstoneCommon.stringifyError(error));
    }
    chainTokenMap = config;
  }
  return chainTokenMap;
}

export const getChainTokenMap: () => ChainTokenMap =
  readAndValidateChainTokenMapConfig;

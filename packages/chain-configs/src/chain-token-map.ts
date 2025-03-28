import {
  findRemoteConfigOrThrow,
  readJsonFile,
  terminateWithNodeRemoteConfigError,
} from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { ChainTokenMapSchema } from "./schemas";
import { ChainTokenMap } from "./tokens";

let chainTokenMapConfigPath: string | null = null;

function readAndValidateChainTokenMapConfig(): ChainTokenMap {
  if (!chainTokenMapConfigPath) {
    chainTokenMapConfigPath = findRemoteConfigOrThrow();
  }
  const config = readJsonFile<ChainTokenMap>(
    `${chainTokenMapConfigPath}/chains/chain-token-map.json`
  );
  try {
    RedstoneCommon.zodAssert<ChainTokenMap>(ChainTokenMapSchema, config);
  } catch (error) {
    terminateWithNodeRemoteConfigError(RedstoneCommon.stringifyError(error));
  }
  return config;
}

export const chainTokenMap: ChainTokenMap =
  readAndValidateChainTokenMapConfig();

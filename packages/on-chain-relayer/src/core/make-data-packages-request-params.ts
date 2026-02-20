import { isMultiFeedAdapterType } from "@redstone-finance/on-chain-relayer-common";
import {
  DataPackagesRequestParams,
  DataPackagesResponseStorage,
  DataServiceIds,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";

export function canIgnoreMissingFeeds(relayerConfig: RelayerConfig) {
  return isMultiFeedAdapterType(relayerConfig.adapterContractType);
}

export function makeDataPackagesRequestParams(
  relayerConfig: RelayerConfig,
  uniqueSignerThreshold: number,
  dataFeedIds?: string[]
): DataPackagesRequestParams {
  const {
    dataServiceId,
    dataFeeds,
    dataPackagesNames,
    cacheServiceUrls,
    waitForAllGatewaysTimeMs,
    enableEnhancedRequestDataPackagesLogs,
    authorizedSigners,
  } = relayerConfig;

  let signers: string[] = authorizedSigners ?? [];
  if (signers.length === 0) {
    signers = getSignersForDataServiceId(dataServiceId as DataServiceIds);
  }

  return {
    dataServiceId,
    uniqueSignersCount: uniqueSignerThreshold,
    dataPackagesIds: dataPackagesNames?.length
      ? [...dataPackagesNames, ...(dataFeedIds ?? dataFeeds)]
      : (dataFeedIds ?? dataFeeds),
    urls: cacheServiceUrls,
    maxTimestampDeviationMS: RedstoneCommon.minToMs(3),
    authorizedSigners: signers,
    ignoreMissingFeed: canIgnoreMissingFeeds(relayerConfig),
    waitForAllGatewaysTimeMs,
    enableEnhancedLogs: enableEnhancedRequestDataPackagesLogs,
    storageInstance: relayerConfig.useGlobalDataPackagesResponseStorage
      ? DataPackagesResponseStorage.getInstance()
      : undefined,
  };
}

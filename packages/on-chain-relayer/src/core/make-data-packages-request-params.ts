import { isMultiFeedAdapterType, UpdateTriggers } from "@redstone-finance/on-chain-relayer-common";
import {
  DataPackagesRequestParams,
  DataPackagesResponseStorage,
  DataServiceIds,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { RelayerConfig } from "../config/RelayerConfig";

let storageInstance: DataPackagesResponseStorage | undefined = undefined;

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
    disableMultiPhaseFetching,
    updateTriggers,
    authenticatedGateways,
  } = relayerConfig;

  let signers: string[] = authorizedSigners ?? [];
  if (signers.length === 0) {
    signers = getSignersForDataServiceId(dataServiceId as DataServiceIds);
  }

  storageInstance ??= new DataPackagesResponseStorage({
    latestTtlMs: relayerConfig.dataPackagesResponseStorageLatestTtlMs,
  });

  const fundamentalDataFeedIds = collectFundamentalDataFeedIds(updateTriggers);

  const baseFeeds = dataFeedIds ?? [...new Set([...dataFeeds, ...fundamentalDataFeedIds])];

  return {
    dataServiceId,
    uniqueSignersCount: uniqueSignerThreshold,
    dataPackagesIds: dataPackagesNames?.length ? [...dataPackagesNames, ...baseFeeds] : baseFeeds,
    urls: cacheServiceUrls,
    maxTimestampDeviationMS: RedstoneCommon.minToMs(3),
    authorizedSigners: signers,
    ignoreMissingFeed: canIgnoreMissingFeeds(relayerConfig),
    waitForAllGatewaysTimeMs,
    enableEnhancedLogs: enableEnhancedRequestDataPackagesLogs,
    storageInstance: relayerConfig.useGlobalDataPackagesResponseStorage
      ? storageInstance
      : undefined,
    disableMultiPhaseFetching,
    authenticatedGateways,
  };
}

const collectFundamentalDataFeedIds = (updateTriggers: Record<string, UpdateTriggers>) => [
  ...new Set(
    Object.values(updateTriggers)
      .filter((t) => t.fundamentalRateDependent)
      .map((t) => t.fundamentalRateDependent!.fundamentalToken)
  ),
];

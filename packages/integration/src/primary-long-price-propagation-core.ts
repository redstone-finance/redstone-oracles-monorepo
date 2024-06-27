import primaryManifest from "@redstone-finance/oracle-node/manifests/data-services/primary.json";
import { getNotBroadcastedDataFeeds } from "./framework/get-not-broadcasted-data-feeds";
import { runLongPricePropagationCoreTest } from "./framework/run-long-price-propagation-core-test";

const REMOVED_DATA_FEEDS: string[] = [];
const DATA_FEEDS_NOT_WORKING_LOCALLY = [
  "PREMIA-TWAP-60",
  "USDB-TWAP-30",
  "ezETH-TWAP-60",
  "SolvBTC_MERLIN/BTC-TWAP-60",
  "SolvBTC_BNB/BTC-TWAP-60",
];
const DATA_FEEDS_NOT_BROADCASTED = getNotBroadcastedDataFeeds(primaryManifest);
const SKIPPED_SOURCES = JSON.parse(
  process.env.SKIPPED_SOURCES ?? "[]"
) as string[];

void (async () => {
  const manifestFileName = "data-services/primary";
  const nodeWorkingTimeInMinutes = 6;
  const nodeIntervalInMilliseconds = 10000;
  const coldStartIterationsCount = 4;
  await runLongPricePropagationCoreTest(
    manifestFileName,
    nodeWorkingTimeInMinutes,
    nodeIntervalInMilliseconds,
    coldStartIterationsCount,
    [
      ...REMOVED_DATA_FEEDS,
      ...DATA_FEEDS_NOT_WORKING_LOCALLY,
      ...DATA_FEEDS_NOT_BROADCASTED,
    ],
    SKIPPED_SOURCES
  );
})();

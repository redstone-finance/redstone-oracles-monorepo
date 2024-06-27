import avalancheManifest from "@redstone-finance/oracle-node/manifests/data-services/avalanche.json";
import { getNotBroadcastedDataFeeds } from "./framework/get-not-broadcasted-data-feeds";
import { runLongPricePropagationCoreTest } from "./framework/run-long-price-propagation-core-test";

const REMOVED_DATA_FEEDS: string[] = [
  "MOO_TJ_AVAX_USDC_LP",
  "PTP",
  "SHLB_AVAX-USDC_B",
  "SHLB_BTC.b-AVAX_B",
  "SHLB_EUROC-USDC_V2_1_B",
  "SHLB_JOE-AVAX_B",
  "TJ_AVAX_BTC_LP",
  "TJ_AVAX_ETH_LP",
  "TJ_AVAX_USDC_LP",
  "TJ_AVAX_USDT_LP",
  "TJ_AVAX_sAVAX_LP",
  "YY_TJ_AVAX_ETH_LP",
  "YY_TJ_AVAX_USDC_LP",
];
const DATA_FEEDS_NOT_WORKING_LOCALLY: string[] = [];
const DATA_FEEDS_NOT_BROADCASTED =
  getNotBroadcastedDataFeeds(avalancheManifest);
const SKIPPED_SOURCES = JSON.parse(
  process.env.SKIPPED_SOURCES ?? "[]"
) as string[];

void (async () => {
  const manifestFileName = "data-services/avalanche";
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

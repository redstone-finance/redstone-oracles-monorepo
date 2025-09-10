import { RelayerConfig } from "./RelayerConfig";
import { changeRelayerConfigFeeds } from "./change-relayer-config-feeds";

export type RelayerSplitConfig = Pick<
  RelayerConfig,
  "dataFeeds" | "feedsSplit" | "splitAllFeeds" | "updateConditions" | "updateTriggers"
>;

export function splitRelayerConfig<T extends RelayerSplitConfig>(relayerConfig: T) {
  const feedsSplit = relayerConfig.splitAllFeeds
    ? relayerConfig.dataFeeds.map((feedId) => [feedId])
    : relayerConfig.feedsSplit;
  const feedsToSplit = feedsSplit?.flatMap((dataFeeds) => dataFeeds);
  if (!feedsSplit || !feedsToSplit?.length) {
    return [relayerConfig];
  }

  const configs: T[] = feedsSplit.map((feeds) => {
    const dataFeeds = feeds.filter((feedId) => relayerConfig.dataFeeds.includes(feedId));
    return changeRelayerConfigFeeds({ ...relayerConfig }, dataFeeds);
  });

  changeRelayerConfigFeeds(
    relayerConfig,
    relayerConfig.dataFeeds.filter((feedId) => !feedsToSplit.includes(feedId))
  );

  configs.push(relayerConfig);

  return configs.filter((config) => config.dataFeeds.length);
}

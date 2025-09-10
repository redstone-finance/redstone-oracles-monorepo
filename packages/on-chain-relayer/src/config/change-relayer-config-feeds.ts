import _ from "lodash";
import type { RelayerSplitConfig } from "./split-relayer-config";

export function changeRelayerConfigFeeds<T extends RelayerSplitConfig>(
  relayerConfig: T,
  dataFeeds: string[]
) {
  relayerConfig.dataFeeds = dataFeeds;
  relayerConfig.updateTriggers = _.pick(relayerConfig.updateTriggers, dataFeeds);
  relayerConfig.updateConditions = _.pick(relayerConfig.updateConditions, dataFeeds);

  return relayerConfig;
}

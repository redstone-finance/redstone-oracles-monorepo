import { UpdateTriggers } from "@redstone-finance/on-chain-relayer-common";
import { expect } from "chai";
import { ConditionCheckNames } from "../../src/config/RelayerConfig";
import { RelayerSplitConfig } from "../../src/config/split-relayer-config";

type PartialSplitConfig<U extends RelayerSplitConfig> = Pick<
  U,
  "feedsSplit" | "splitAllFeeds" | "dataFeeds"
> &
  Partial<Pick<U, "updateTriggers" | "updateConditions">>;

export function prepareConfig<T extends PartialSplitConfig<RelayerSplitConfig>>(
  config: T
): T & RelayerSplitConfig {
  return {
    ...config,
    updateTriggers:
      config.updateTriggers ??
      Object.fromEntries(config.dataFeeds.map((feedId) => [feedId, {} as UpdateTriggers])),
    updateConditions:
      config.updateConditions ??
      Object.fromEntries(config.dataFeeds.map((feedId) => [feedId, [] as ConditionCheckNames[]])),
  };
}

export function expectFeeds(result: RelayerSplitConfig, feedIds: string[]) {
  expect(result.dataFeeds).to.deep.equal(feedIds);
  expect(Object.keys(result.updateTriggers)).to.deep.equal(feedIds);
  expect(Object.keys(result.updateConditions)).to.deep.equal(feedIds);
}

import { FeedMapping } from "../../src/sep-40-types";
import { makeSep40Ops } from "./make-sep-40-ops";

const FEED_MAPPINGS: FeedMapping[] = [
  {
    feed: "CETES",
    asset: {
      tag: "Other",
      symbol: "CETES",
    },
    decimals: 8,
  },
];

async function addFeeds() {
  const adapter = makeSep40Ops();

  for (const feedMapping of FEED_MAPPINGS) {
    const result = await adapter.addFeed(feedMapping);
    console.log(`Added ${feedMapping.feed}:`, result);
  }
}

void addFeeds();

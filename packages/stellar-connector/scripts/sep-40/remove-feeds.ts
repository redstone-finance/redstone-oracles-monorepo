import { makeSep40Ops } from "./make-sep-40-ops";

const FEEDS: string[] = [];

async function removeFeeds() {
  const adapter = makeSep40Ops();

  for (const feed of FEEDS) {
    const result = await adapter.removeFeed(feed);
    console.log(`Removed ${feed}:`, result);
  }
}

void removeFeeds();

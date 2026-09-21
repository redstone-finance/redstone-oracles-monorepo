const FEED_SYMBOL_OVERRIDES: Record<string, string | undefined> = {
  native: "XLM",
  EURC: "EUROC",
  xSolvBTC: "SolvBTC.BBN",
  XAUM: "XAUm",
};

const FEED_SUFFIXES = ["_FUNDAMENTAL/USD", "_FUNDAMENTAL"];

export function getFeedSymbol(assetSymbol: string, feedId: string) {
  const symbol = FEED_SYMBOL_OVERRIDES[assetSymbol] ?? assetSymbol;

  return `${symbol}${getFeedSuffix(feedId)}`;
}

function getFeedSuffix(feedId: string) {
  return FEED_SUFFIXES.find((suffix) => feedId.endsWith(suffix)) ?? "";
}

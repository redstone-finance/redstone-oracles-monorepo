const FEED_ID_OVERRIDES: Record<string, string | undefined> = {
  native: "XLM",
  EURC: "EUROC",
  USDE: "USDe",
  SUSDE: "sUSDe",
  USDY: "USDY_FUNDAMENTAL/USD",
  SolvBTC: "SolvBTC_FUNDAMENTAL/USD",
  xSolvBTC: "SolvBTC.BBN_FUNDAMENTAL/USD",
  XAUM: "XAUm_FUNDAMENTAL/USD",
  deJTRSY: "deJTRSY_FUNDAMENTAL/USD",
  deJAAA: "deJAAA_FUNDAMENTAL/USD",
  "savUSD/avUSD": "savUSD_FUNDAMENTAL",
};

const USD_DENOMINATION = "USD";

export function getFeedId(assetSymbol: string, baseAssetSymbol: string) {
  const assetPair = getAssetPair(assetSymbol, baseAssetSymbol);

  return FEED_ID_OVERRIDES[assetPair] ?? assetPair;
}

function getAssetPair(assetSymbol: string, baseAssetSymbol: string) {
  return baseAssetSymbol === USD_DENOMINATION ? assetSymbol : `${assetSymbol}/${baseAssetSymbol}`;
}

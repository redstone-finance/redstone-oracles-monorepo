const baseManifest = {
  interval: 2000,
  priceAggregator: "median",
  sourceTimeout: 3000,
  maxPriceDeviationPercent: 25,
  evmChainId: 1,
  httpBroadcasterURLs: ["http://localhost:9000"],
  enableStreamrBroadcaster: true,
  disableSinglePricesBroadcastingInStreamr: false,
  enableArweaveBackup: false,
};

export const MOCK_MANIFEST = {
  ...baseManifest,
  tokens: {
    BTC: {
      source: ["bitfinex", "ftx"],
    },
    ETH: {
      source: ["binance", "bitfinex"],
    },
    USDT: {
      source: ["ftx", "binance"],
    },
  },
};

export const MOCK_NODE_CONFIG = {
  enableJsonLogs: false,
  enablePerformanceTracking: false,
  printDiagnosticInfo: false,
  manifestRefreshInterval: 120000,
  overrideManifestUsingFile: MOCK_MANIFEST,
  privateKeys: {
    arweaveJwk: { e: "e", kty: "kty", n: "n" },
    ethereumPrivateKey:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
  },
  credentials: {},
};

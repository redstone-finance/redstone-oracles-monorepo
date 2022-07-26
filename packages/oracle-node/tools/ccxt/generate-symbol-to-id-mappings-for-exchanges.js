const ccxt = require("ccxt");
const fs = require("fs");
const supportedExchanges = require("../../src/fetchers/ccxt/all-supported-exchanges.json");

const OUTPUT_FOLDER = "./src/fetchers/ccxt/symbol-to-id";

main();

async function main() {
  for (const exchangeId of supportedExchanges) {
    await generateMappingForEchange(exchangeId);
  }
}

async function generateMappingForEchange(exchangeId) {
  console.log(`\n\n== Generating mapping for: ${exchangeId} ==`);

  // Loading current manifest from file
  const currentManifest = require(`../../manifests/${exchangeId}.json`);

  // Loading markets for the given exchnage
  const exchange = new ccxt[exchangeId]();
  console.log(`Loading markets list...`);
  const markets = Object.values(await exchange.loadMarkets());
  console.log(`Loaded ${markets.length} markets`);

  // Generating the mapping
  const symbolToId = {};
  for (const market of markets) {
    const symbol = market.symbol;
    if (
      symbol.endsWith("/USD") ||
      (symbol.endsWith("/USDT") && !symbolToId[market.base])
    ) {
      symbolToId[market.base] = market.symbol;
    }
  }

  // Mapping validation
  for (const symbol of Object.keys(currentManifest.tokens)) {
    if (!symbolToId[symbol]) {
      // throw new Error(`Symbol ${symbol} is not in the mapping`);
      console.warn(`[WARN]: Symbol ${symbol} is not in the mapping`);
    }
  }

  // Saving output mapping to a file
  const outputFile = `${OUTPUT_FOLDER}/${exchangeId}.json`;
  console.log(`Saving output to: ${outputFile}`);
  fs.writeFileSync(outputFile, JSON.stringify(symbolToId, null, 2) + "\n");
}

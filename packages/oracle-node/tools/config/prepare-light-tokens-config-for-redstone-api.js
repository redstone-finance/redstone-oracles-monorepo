const _ = require("lodash");
const fullTokensConfig = require("../../src/config/tokens.json");

const lightTokensConfig = {};

for (const [symbol, details] of Object.entries(fullTokensConfig)) {
  const providers = details.providers;
  if (providers && providers.length > 0) {
    lightTokensConfig[symbol] = providers;
  }
}

console.log("\n\n== Light tokens config ==\n\n");
console.log(JSON.stringify(lightTokensConfig, null, 2));

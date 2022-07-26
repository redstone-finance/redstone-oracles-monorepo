const prompts = require("prompts");
const redstone = require("redstone-api");
const { default: Bundlr } = require("@bundlr-network/client");
const bundlrDefaults = require("../../src/arweave/bundlr-defaults.json");

main();

async function main() {
  // Prompt bytesCount
  const { bytesCount } = await prompts({
    type: "number",
    name: "bytesCount",
    message: "Enter bytes count",
  });

  // Create bundlr instance
  const bundlr = new Bundlr(
    bundlrDefaults.defaultUrl,
    bundlrDefaults.defaultCurrency
  );

  // Get balance
  const cost = await bundlr.getPrice(bytesCount);
  const costAR = bigNumberToHumanReadableNumber(cost);
  const costUSD = (await redstone.getPrice("AR")).value * costAR;

  // Print balance
  console.log(`Cost for ${bytesCount} bytes: ${costAR} AR ($${costUSD})`);
}

function bigNumberToHumanReadableNumber(amount) {
  return amount.div(1e12).toNumber();
}

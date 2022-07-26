const prompts = require("prompts");
const { default: Bundlr } = require("@bundlr-network/client");
const bundlrDefaults = require("../../src/arweave/bundlr-defaults.json");

main();

async function main() {
  // Prompt address
  const { address } = await prompts({
    type: "text",
    name: "address",
    message: "Enter address",
  });

  // Create bundlr instance
  const bundlr = new Bundlr(
    bundlrDefaults.defaultUrl,
    bundlrDefaults.defaultCurrency
  );

  // Get balance
  const balance = await bundlr.getBalance(address);

  // Print balance
  const formattedBalance = bigNumberToHumanReadableNumber(balance);
  console.log(`Balance for ${address}: ${formattedBalance}`);
}

function bigNumberToHumanReadableNumber(amount) {
  return amount.div(1e12).toNumber();
}

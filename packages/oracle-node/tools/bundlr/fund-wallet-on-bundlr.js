const prompts = require("prompts");
const { default: Bundlr } = require("@bundlr-network/client");
const bundlrDefaults = require("../../src/arweave/bundlr-defaults.json");

main();

async function main() {
  // Prompt JWK and amount of ARs to fund
  const { jwkStringified } = await prompts({
    type: "text",
    name: "jwkStringified",
    message: "Enter JWK private key",
  });
  const { amountOfARs } = await prompts({
    type: "text",
    name: "amountOfARs",
    message: "Enter amount of ARs to fund (e.g. 0.3)",
  });

  // Initialise bundlr client
  const jwk = JSON.parse(jwkStringified);
  const bundlr = new Bundlr(
    bundlrDefaults.defaultUrl,
    bundlrDefaults.defaultCurrency,
    jwk
  );

  // Final confirmation
  const winstonsAmount = amountOfARs * 10 ** 12;
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `Are you sure you want to fund ${amountOfARs}AR (${winstonsAmount} winstons)?`,
    initial: false,
  });
  if (!confirm) {
    console.log("User cancelled funding");
    return;
  }

  // Send funding tx
  console.log(`Sending funding tx...`);
  const tx = await bundlr.fund(winstonsAmount);
  console.log(tx);
  console.log(
    `Funding tx sent. Funding tx processing may take ~1 hour (sometimes even more)`
  );
}

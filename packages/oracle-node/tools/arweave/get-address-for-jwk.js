const prompts = require("prompts");
const Arweave = require("arweave/node");

const arweave = Arweave.init({
  host: "arweave.net", // Hostname or IP address for a Arweave host
  port: 443, // Port
  protocol: "https", // Network protocol http or https
  timeout: 60000, // Network request timeouts in milliseconds
  logging: false, // Enable network request logging
});

main();

async function main() {
  const { jwkStringified } = await prompts({
    type: "text",
    name: "jwkStringified",
    message: "Enter JWK",
  });

  const jwk = JSON.parse(jwkStringified);

  const address = await arweave.wallets.jwkToAddress(jwk);

  console.log({ address });
}

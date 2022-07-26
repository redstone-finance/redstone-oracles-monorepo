const { ethers } = require("ethers");
const Arweave = require("arweave/node");

main();

async function main() {
  const { publicProviderDetails, config } = await generateNewRandomNodeConfig();

  console.log(`\n\n== Public provider details ==\n`);
  console.log(JSON.stringify(publicProviderDetails, null, 2));

  console.log(`\n\n== Provider JWK ==\n`);
  console.log(JSON.stringify(config.arweaveKeysJWK));

  console.log(`\n\n== Private provider config ==\n`);
  console.log(JSON.stringify(config));
}

async function generateNewRandomNodeConfig() {
  const arweave = Arweave.init({
    host: "arweave.net", // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: "https", // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false, // Enable network request logging
  });

  const evmWallet = ethers.Wallet.createRandom();
  const jwk = await arweave.wallets.generate();
  const arweaveAddress = await arweave.wallets.jwkToAddress(jwk);
  const arweavePublicKey = getPublicKey(jwk);

  return {
    config: {
      arweaveKeysJWK: jwk,
      credentials: {
        ethereumPrivateKey: evmWallet.privateKey,
      },
    },
    publicProviderDetails: {
      address: arweaveAddress,
      publicKey: arweavePublicKey,
      evmAddress: evmWallet.address,
      ecdsaPublicKey: evmWallet.publicKey,
    },
  };
}

// Public key is saved in the "n"
// More info: https://docs.arweave.org/developers/server/http-api#addressing
function getPublicKey(jwk) {
  return jwk.n;
}

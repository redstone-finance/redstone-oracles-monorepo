// const axios = require("axios");
const Arweave = require("arweave/node");
const redstone = require("redstone-api");
const _ = require("lodash");

const TX_COUNT = 500;
const TIME_INTERVAL = 3 * 3600 * 1000; // 3 hours
const STANDARD_OFFSET = 10 * 3600 * 1000; // 10 hours

const arweave = Arweave.init({
  host: "arweave.net", // Hostname or IP address for a Arweave host
  port: 443, // Port
  protocol: "https", // Network protocol http or https
  timeout: 60000, // Network request timeouts in milliseconds
  logging: false, // Enable network request logging
});

main();

async function main() {
  for (let counter = 0; counter < TX_COUNT; counter++) {
    const timestamp = Date.now() - (STANDARD_OFFSET + counter * TIME_INTERVAL);
    const price = await redstone.getHistoricalPrice("ETH", {
      date: timestamp,
      provider: "redstone",
    });
    const { permawebTx } = price;
    console.log(
      `\n${counter} (${new Date(timestamp).toUTCString()}): ${permawebTx}`
    );
    try {
      const txDetails = await arweave.transactions.get(permawebTx);
      console.log(_.pick(txDetails, ["reward", "data_size"]));
    } catch {
      console.log(
        `=== !!! Failed to load tx details for: ${permawebTx} !!! ===`
      );
    }
  }
}

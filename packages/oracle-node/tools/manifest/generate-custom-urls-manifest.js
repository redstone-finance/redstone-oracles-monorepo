const ethers = require("ethers");
const fs = require("fs");
const { generateManifest } = require("./manifest-generator");

const CUSTOM_URLS_WITH_JSON_PATHS = [
  {
    jsonpath: "$.RAW.ETH.USD.PRICE",
    url: "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD",
  },
  {
    jsonpath: "$.RAW.ETH.USD.MEDIAN",
    url: "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD",
  },
  {
    jsonpath: "$.RAW.ETH.USD.VOLUMEDAY",
    url: "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD",
  },
];
const OUTPUT_FILE_PATH = "./manifests/custom-urls.json";

main();

function main() {
  const tokens = {};
  for (const { jsonpath, url } of CUSTOM_URLS_WITH_JSON_PATHS) {
    const symbol = ethers.utils.id(`${jsonpath}---${url}`).slice(0, 18);
    tokens[symbol] = {
      customUrlDetails: { url, jsonpath },
    };
  }

  const manifest = generateManifest({ tokens, maxPriceDeviationPercent: 100 });
  manifest.defaultSource = ["custom-urls"];

  // Saving manifest to the output file
  console.log(`Saving manifest to: ${OUTPUT_FILE_PATH}`);
  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

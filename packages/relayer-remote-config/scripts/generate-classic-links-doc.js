const fs = require("fs");
const path = require("path");

function printClassicLinks(relayerName) {
  const filePath = path.resolve(
    __dirname,
    `../main/relayer-manifests-multi-feed/${relayerName}.json`
  );
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const jsonData = JSON.parse(fileContent);

  const priceFeedKeys = Object.keys(jsonData.priceFeeds || {});

  priceFeedKeys.forEach((dataFeedId) => {
    console.log(`- <ClassicLink relayerName="${relayerName}" dataFeedId="${dataFeedId}" />`);
  });
}

const relayerName = process.argv[2];

if (!relayerName) {
  console.error("Please provide a relayerName.");
  process.exit(1);
}

printClassicLinks(relayerName);

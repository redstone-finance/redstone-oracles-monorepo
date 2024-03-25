import { requestRedstonePayload } from "../../src";

const DATA_SERVICE_ID = "redstone-avalanche-prod";
const DATA_FEEDS = ["ETH", "BTC"];
const UNIQUE_SIGNER_COUNT = 3;

const scriptArgs = process.argv.slice(2);

requestRedstonePayload(
  {
    dataFeeds: DATA_FEEDS,
    dataServiceId: DATA_SERVICE_ID,
    uniqueSignersCount: UNIQUE_SIGNER_COUNT,
  },
  scriptArgs[0]
)
  .then((value) => console.log(value))
  .catch((e) => console.error(e));

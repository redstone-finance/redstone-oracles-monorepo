import {
  DataServiceIds,
  getPreloadedSignersForDataServiceId,
  requestRedstonePayload,
} from "../../src";

const DATA_SERVICE_ID = "redstone-primary-prod";
const DATA_FEEDS = ["BTC", "ETH"];
const UNIQUE_SIGNER_COUNT = 3;

const scriptArgs = process.argv.slice(2);

requestRedstonePayload(
  {
    dataPackagesIds: DATA_FEEDS,
    dataServiceId: DATA_SERVICE_ID,
    uniqueSignersCount: UNIQUE_SIGNER_COUNT,
    authorizedSigners: getPreloadedSignersForDataServiceId(
      DATA_SERVICE_ID as DataServiceIds
    ),
  },
  scriptArgs[0]
)
  .then((value) => console.log(value))
  .catch((e) => console.error(e));

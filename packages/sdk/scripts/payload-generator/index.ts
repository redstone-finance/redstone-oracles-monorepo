import * as fs from "node:fs";
import path from "node:path";
import {
  convertDataPackagesResponse,
  DataServiceIds,
  getSignersForDataServiceId,
  requestDataPackages,
  requestRedstonePayload,
} from "../../src";

const DATA_SERVICE_ID = "redstone-primary-prod";
const DATA_FEEDS = ["BTC", "ETH"];
const UNIQUE_SIGNER_COUNT = 3;

const scriptArgs = process.argv.slice(2);

async function requestPayloads(format: string, filenamePrefix?: string) {
  const reqParams = {
    dataPackagesIds: DATA_FEEDS,
    dataServiceId: DATA_SERVICE_ID,
    uniqueSignersCount: UNIQUE_SIGNER_COUNT,
    authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID as DataServiceIds),
  };

  if (format === "all" && filenamePrefix) {
    const signedDataPackagesResponse = await requestDataPackages(reqParams);

    for (format of ["hex", "bytes", "json"]) {
      fs.writeFileSync(
        path.join(__dirname, `${filenamePrefix}.${format}`),
        convertDataPackagesResponse(signedDataPackagesResponse, format)
      );
    }
  } else {
    console.log(await requestRedstonePayload(reqParams, format));
  }
}

async function main() {
  await requestPayloads(scriptArgs[0], scriptArgs[1]);
}

void main();

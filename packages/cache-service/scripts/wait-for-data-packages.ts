// Make sure this import comes first. This is a hack to set some potentially missing env vars
// that are required by cache-service/src/config.ts which is indirectly imported by this script
import "./set-required-missing-env-vars";

import mongoose from "mongoose";
import { DataPackage } from "../src/data-packages/data-packages.model";

// USAGE: yarn run-ts scripts/wait-for-data-packages.ts <expected-count> <data-package-id> <mongo-url>
// Note: This script is used by tests in `integration` package

const INTERVAL_MILLISECONDS = 5000;
const EXPECTED_COUNT = parseInt(process.argv[2]);
const DATA_PACKAGE_ID = process.argv[3];
const MONGO_DB_URL = process.argv[4];

void main();

async function main() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_DB_URL);
  console.log("MongoDB connected");

  await checkDataPackagesCount();
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- add reason here, please
  setInterval(checkDataPackagesCount, INTERVAL_MILLISECONDS);
}

async function checkDataPackagesCount() {
  const dataPackagesCount = await queryDataPackages(DATA_PACKAGE_ID);
  console.log(`Fetched data packages count: ${dataPackagesCount}`);
  if (dataPackagesCount >= EXPECTED_COUNT) {
    console.log(`Expected data packages count reached: ${EXPECTED_COUNT}. Stopping...`);
    process.exit();
  }
}

async function queryDataPackages(dataPackageId: string) {
  const dataPackages = await DataPackage.find({ dataPackageId });
  return dataPackages.length;
}

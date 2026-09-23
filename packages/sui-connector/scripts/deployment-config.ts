import { RedstoneCommon } from "@redstone-finance/utils";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { makeSuiConfig, SuiNetworkName } from "../src";

interface Ids {
  packageId: string;
  priceAdapterObjectId: string;
  adminCapId: string;
  upgradeCapId: string;
}

export function getDeployDir() {
  return RedstoneCommon.getFromEnv(
    "DEPLOY_DIR",
    z.string().optional().default("sui/contracts/price_adapter")
  );
}

export function readIds(network: SuiNetworkName) {
  return JSON.parse(fs.readFileSync(getIdsFilePath(network), "utf8")) as Ids;
}

export function saveIds(ids: Ids, network: SuiNetworkName) {
  fs.writeFileSync(getIdsFilePath(network), JSON.stringify(ids, null, 4));
}

export function readSuiConfig(network: SuiNetworkName) {
  return makeSuiConfig(readIds(network));
}

function getIdsFilePath(network: SuiNetworkName) {
  return path.join(__dirname, `..`, getDeployDir(), `/object_ids.${network}.json`);
}

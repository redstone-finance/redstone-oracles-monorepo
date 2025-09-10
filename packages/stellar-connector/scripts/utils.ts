import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { StellarNetwork } from "../src/stellar/network-ids";

type StellarContract = typeof PRICE_ADAPTER | typeof PRICE_FEED;

export const PRICE_ADAPTER = "redstone_adapter";
export const PRICE_FEED = "redstone_price_feed";

const OUTPUT_DIR = readDeployDir();

export function readUrl() {
  return RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
}

export function readNetwork(): StellarNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(["testnet", "mainnet", "custom"]));
}

export function readDeployDir() {
  return RedstoneCommon.getFromEnv("DEPLOY_DIR", z.string().optional()) ?? "./stellar";
}

export function makeServer() {
  return new rpc.Server(readUrl(), { allowHttp: true });
}

function getIdFilepath(contract: string, dir = OUTPUT_DIR, network = readNetwork()) {
  return path.join(dir, `${contract}-id.${network}`);
}

export function saveAdapterId(adapterId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(PRICE_ADAPTER, dir);

  writeFileSync(filepath, adapterId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadAdapterId(dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(PRICE_ADAPTER, dir)).toString("utf-8");
}

export function savePriceFeedId(priceFeedContractId: string, feedId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(`${PRICE_FEED}-${feedId}`, dir);

  writeFileSync(filepath, priceFeedContractId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadPriceFeedId(feedId: string, dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(`${PRICE_FEED}-${feedId}`, dir)).toString("utf-8");
}

export function wasmFilePath(contractName: StellarContract, dir = OUTPUT_DIR) {
  return `${dir}/target/wasm32v1-none/release/${contractName}.wasm`;
}

export function loadContractName() {
  return RedstoneCommon.getFromEnv(
    "CONTRACT_NAME",
    z.enum([PRICE_ADAPTER, PRICE_FEED]).optional().default(PRICE_ADAPTER)
  );
}

export function loadContractId(outputDir = OUTPUT_DIR) {
  const contractName = loadContractName();
  switch (contractName) {
    case PRICE_ADAPTER:
      return loadAdapterId(outputDir);
    case PRICE_FEED:
      return loadPriceFeedId(RedstoneCommon.getFromEnv("PRICE_FEED_ID", z.string()), outputDir);
  }
}

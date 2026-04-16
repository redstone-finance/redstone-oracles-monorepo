import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { StellarNetwork } from "../src";

type StellarContract =
  | typeof PRICE_ADAPTER
  | typeof PRICE_FEED
  | typeof SEP40_CONTRACT
  | typeof MULTICALL;

export const PRICE_ADAPTER = "redstone_adapter";
export const PRICE_FEED = "redstone_price_feed";
export const SEP40_CONTRACT = "redstone_sep_40";
export const MULTICALL = "stellar_router_v0";

const OUTPUT_DIR = readDeployDir();

export function readUrl() {
  return RedstoneCommon.getFromEnv("RPC_URL", z.url());
}

export function readNetwork(): StellarNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(["testnet", "mainnet", "custom"]));
}

export function readDeployDir() {
  return RedstoneCommon.getFromEnv("DEPLOY_DIR", z.string().optional()) ?? "./stellar";
}

export function readPriceFeedId(orDefault = "ETH") {
  return RedstoneCommon.getFromEnv("PRICE_FEED_ID", z.string().default(orDefault));
}

export function makeServer() {
  return new rpc.Server(readUrl(), { allowHttp: true });
}

function getIdFilepath(contract: string, dir = OUTPUT_DIR, network = readNetwork()) {
  return path.join(dir, `${contract.replace("/", "-")}-id.${network}`);
}

export function saveAdapterId(adapterId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(PRICE_ADAPTER, dir);

  writeFileSync(filepath, adapterId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function saveMulticallId(multicallId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(MULTICALL, dir);

  writeFileSync(filepath, multicallId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadAdapterId(dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(PRICE_ADAPTER, dir)).toString("utf-8");
}

export function loadMulticallId(dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(MULTICALL, dir)).toString("utf-8");
}

export function savePriceFeedId(priceFeedContractId: string, feedId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(`${PRICE_FEED}-${feedId}`, dir);

  writeFileSync(filepath, priceFeedContractId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadPriceFeedId(feedId = readPriceFeedId(), dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(`${PRICE_FEED}-${feedId}`, dir)).toString("utf-8");
}

export function wasmFilePath(contractName: StellarContract, dir = OUTPUT_DIR) {
  return `${dir}/target/wasm32v1-none/release/${contractName}.wasm`;
}

export function loadContractName() {
  return RedstoneCommon.getFromEnv(
    "CONTRACT_NAME",
    z.enum([PRICE_ADAPTER, PRICE_FEED, MULTICALL]).optional().default(PRICE_ADAPTER)
  );
}

export function loadContractId(outputDir = OUTPUT_DIR) {
  const contractName = loadContractName();
  switch (contractName) {
    case PRICE_ADAPTER:
      return loadAdapterId(outputDir);
    case PRICE_FEED:
      return loadPriceFeedId(readPriceFeedId(), outputDir);
    case MULTICALL:
      return loadMulticallId(outputDir);
  }
}

export function saveSep40Id(contractId: string, dir = OUTPUT_DIR) {
  const filepath = getIdFilepath(SEP40_CONTRACT, dir);
  writeFileSync(filepath, contractId);
  console.log(`✅ Id saved to ${filepath}`);
}

export function loadSep40Id(dir = OUTPUT_DIR) {
  return readFileSync(getIdFilepath(SEP40_CONTRACT, dir)).toString("utf-8");
}

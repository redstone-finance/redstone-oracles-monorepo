import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { StellarNetwork } from "../src/stellar/network-ids";

export const PRICE_ADAPTER = "redstone_adapter";
export const PRICE_FEED = "redstone_price_feed";

const OUTPUT_DIR = readDeployDir();

export function readUrl() {
  return RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
}

export function readNetwork(): StellarNetwork {
  return RedstoneCommon.getFromEnv(
    "NETWORK",
    z.enum(["testnet", "mainnet", "custom"])
  );
}

export function readDeployDir() {
  return (
    RedstoneCommon.getFromEnv("DEPLOY_DIR", z.string().optional()) ??
    "./stellar"
  );
}

export function makeServer() {
  return new rpc.Server(readUrl(), { allowHttp: true });
}

export function saveAdapterId(adapterId: string, dir = OUTPUT_DIR) {
  const network = readNetwork();
  const filepath = path.join(dir, `adapter-id.${network}`);

  writeFileSync(filepath, adapterId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadAdapterId(dir = OUTPUT_DIR) {
  const network = readNetwork();
  const filepath = path.join(dir, `adapter-id.${network}`);

  return readFileSync(filepath).toString("utf-8");
}

export function savePriceFeedId(
  priceFeedContractId: string,
  feedId: string,
  dir = OUTPUT_DIR
) {
  const network = readNetwork();
  const filepath = path.join(dir, `price-feed-${feedId}.${network}`);

  writeFileSync(filepath, priceFeedContractId);

  console.log(`✅ Id saved to ${filepath}`);
}

export function loadPriceFeedId(feedId: string, dir = OUTPUT_DIR) {
  const network = readNetwork();
  const filepath = path.join(dir, `price-feed-${feedId}.${network}`);

  return readFileSync(filepath).toString("utf-8");
}

export function wasmFilePath(
  contractName: typeof PRICE_ADAPTER | typeof PRICE_FEED,
  dir = OUTPUT_DIR
) {
  return `${dir}/target/wasm32v1-none/release/${contractName}.wasm`;
}

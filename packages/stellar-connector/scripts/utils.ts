import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { StellarNetwork } from "../src/stellar/network-ids";

const OUTPUT_DIR = "./stellar/";

export function readUrl() {
  return RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
}

export function readNetwork(): StellarNetwork {
  return RedstoneCommon.getFromEnv(
    "NETWORK",
    z.enum(["testnet", "mainnet", "custom"])
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

export function wasmFilePath(contractName: "redstone_adapter" | "price_feed") {
  return `./stellar/target/wasm32v1-none/release/${contractName}.wasm`;
}

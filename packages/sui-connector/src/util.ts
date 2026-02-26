import { bcs, BcsType } from "@mysten/bcs";
import type { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import { arrayify, isHexString } from "ethers/lib/utils";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { makeSuiConfig, SuiNetworkName } from "./config";
import { getSuiNetworkName } from "./network-ids";

export const GRAPHQL_URLS = {
  mainnet: "https://graphql.mainnet.sui.io/graphql",
  testnet: "https://graphql.testnet.sui.io/graphql",
  devnet: "https://graphql.devnet.sui.io/graphql",
  localnet: "http://localhost:9125/graphql",
};

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

function getIdsFilePath(network: SuiNetworkName) {
  return path.join(__dirname, `..`, getDeployDir(), `/object_ids.${network}.json`);
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

export function makeSuiKeypair(privateKey?: string): Keypair {
  const key = privateKey ?? RedstoneCommon.getFromEnv("PRIVATE_KEY");
  if (!key) {
    throw new Error("PRIVATE_KEY is not set, privateKey param not provided");
  }

  return Secp256k1Keypair.fromSecretKey(
    isHexString(key) || isHexString(`0x${key}`) ? arrayify(key, { allowMissingPrefix: true }) : key
  );
}

export function makeSuiClient(network: SuiNetworkName | number, url?: string) {
  let networkName;
  if (typeof network === "number") {
    networkName = getSuiNetworkName(network);
  } else {
    networkName = network;
  }

  return new SuiGrpcClient({
    baseUrl: url ?? getJsonRpcFullnodeUrl(networkName),
    network: networkName,
  });
}

export function makeSuiJsonRpcClient(network: SuiNetworkName | number, url?: string) {
  let networkName;
  if (typeof network === "number") {
    networkName = getSuiNetworkName(network);
  } else {
    networkName = network;
  }

  return new SuiJsonRpcClient({
    url: url ?? getJsonRpcFullnodeUrl(networkName),
    network: networkName,
  });
}

export function makeSuiGraphQLClient(network: SuiNetworkName | number, url?: string) {
  let networkName;
  if (typeof network === "number") {
    networkName = getSuiNetworkName(network);
  } else {
    networkName = network;
  }

  return new SuiGraphQLClient({
    url: url ?? GRAPHQL_URLS[networkName],
    network: networkName,
  });
}

export function hexToBytes(data: string): Uint8Array {
  if (!data.startsWith("0x")) {
    throw new Error("Hex string must start with 0x");
  }

  return Uint8Array.from(
    data
      .slice(2)
      .match(/.{2}/g)!
      .map((byte) => parseInt(byte, 16))
  );
}

export function serialize<T, U>(type: BcsType<T, U>, value: U, asOptional = false) {
  return (asOptional ? bcs.option(type) : type).serialize(value);
}

export function serializeSigners(signers: string[], asOptional = false) {
  return serialize(bcs.vector(bcs.vector(bcs.u8())), signers.map(hexToBytes), asOptional);
}

export function serializeAddresses(addresses: string[], asOptional = false) {
  return serialize(bcs.vector(bcs.bytes(32)), addresses.map(hexToBytes), asOptional);
}

export function makeFeedIdBytes(feedId: string): Uint8Array {
  return Uint8Array.from(Buffer.from(feedId.padEnd(32, "\0")));
}

export function uint8ArrayToBcs(uint8Array: Uint8Array) {
  return bcs.vector(bcs.u8()).serialize(uint8Array);
}

export function buildPackage(packagePath: string, environment: SuiNetworkName) {
  const buildCmd = `sui move build --force --dump-bytecode-as-base64 --build-env ${environment}`;

  return JSON.parse(
    execSync(`${buildCmd} --path ${packagePath}`, {
      encoding: "utf8",
    })
  ) as { modules: string[]; dependencies: string[]; digest: number[] };
}

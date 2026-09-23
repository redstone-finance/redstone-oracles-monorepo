import { bcs, BcsType } from "@mysten/bcs";
import type { Keypair } from "@mysten/sui/cryptography";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import Decimal from "decimal.js";
import { makeSuiGrpcClient } from "./client/make-sui-grpc-client";
import { SuiNetworkName } from "./config";
import { getSuiNetworkName } from "./network-ids";

export const GRAPHQL_URL = {
  mainnet: "https://graphql.mainnet.sui.io/graphql",
  testnet: "https://graphql.testnet.sui.io/graphql",
  devnet: "https://graphql.devnet.sui.io/graphql",
  localnet: "http://localhost:9125/graphql",
};
const FEED_ID_BYTE_LENGTH = 32;

export function makeSuiKeypair(privateKey?: string): Keypair {
  const key = privateKey ?? RedstoneCommon.getFromEnv("PRIVATE_KEY");
  if (!key) {
    throw new Error("PRIVATE_KEY is not set, privateKey param not provided");
  }

  return Secp256k1Keypair.fromSecretKey(
    RedstoneCommon.isHexString(key) ? RedstoneCommon.arrayify(key) : key
  );
}

export function makeSuiClient(network: SuiNetworkName | number, url?: string, token?: string) {
  let networkName;
  if (typeof network === "number") {
    networkName = getSuiNetworkName(network);
  } else {
    networkName = network;
  }

  return makeSuiGrpcClient(networkName, url ?? getJsonRpcFullnodeUrl(networkName), token);
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
    url: url ?? GRAPHQL_URL[networkName],
    network: networkName,
  });
}

export function suiToMist(amount: number) {
  return BigInt(new Decimal(amount).times(MIST_PER_SUI.toString()).floor().toString());
}

export function hexToBytes(data: string): Uint8Array {
  if (!data.startsWith("0x")) {
    throw new Error("Hex string must start with 0x");
  }

  return RedstoneCommon.arrayify(data);
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
  const bytes = Uint8Array.from(Buffer.from(feedId.padEnd(FEED_ID_BYTE_LENGTH, "\0")));
  RedstoneCommon.assert(
    bytes.length === FEED_ID_BYTE_LENGTH,
    `Feed id ${feedId} takes ${bytes.length} bytes, expected ${FEED_ID_BYTE_LENGTH}`
  );

  return bytes;
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

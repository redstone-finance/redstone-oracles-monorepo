import "dotenv/config";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Manifest, NodeConfig } from "./types";
import { readJSON } from "./utils/objects";
import { ethers } from "ethers";

const DEFAULT_ENABLE_PERFORMANCE_TRACKING = "true";
const DEFAULT_ENABLE_JSON_LOGS = "true";
const DEFAULT_PRINT_DIAGNOSTIC_INFO = "true";
const DEFAULT_MANIFEST_REFRESH_INTERVAL = "120000";
const DEFAULT_TWELVE_DATA_RAPID_API_KEY = "";

const getFromEnv = (envName: string, defaultValue?: string): string => {
  const valueFromEnv = process.env[envName];
  if (!valueFromEnv) {
    if (defaultValue === undefined) {
      throw new Error(`Env ${envName} must be specified`);
    }
    return defaultValue;
  }
  return valueFromEnv;
};

const parserFromString = {
  number(value: string): number {
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
      throw new Error(`Invalid number value: ${numberValue}`);
    }
    return numberValue;
  },
  boolean(value: string): boolean {
    if (!(value === "true" || value === "false")) {
      throw new Error(`Invalid boolean value: ${value}`);
    }
    return value === "true";
  },
  hex(value: string): string {
    const hexValue = value.startsWith("0x") ? value : `0x${value}`;
    if (!ethers.utils.isHexString(hexValue)) {
      throw new Error(`Invalid hex value: ${hexValue}`);
    }
    return hexValue;
  },
};

const getOptionallyManifestData = () => {
  const overrideManifestUsingFile = getFromEnv(
    "OVERRIDE_MANIFEST_USING_FILE",
    ""
  );
  if (!!overrideManifestUsingFile) {
    return readJSON(overrideManifestUsingFile) as Manifest;
  }
};

export const getArweaveWallet = (): JWKInterface => {
  const arweaveKeysFile = process.env.ARWEAVE_KEYS_FILE_PATH;
  const arweaveKeysJWK = process.env.ARWEAVE_KEYS_JWK;
  if (arweaveKeysFile) {
    return readJSON(arweaveKeysFile);
  } else if (arweaveKeysJWK) {
    return JSON.parse(arweaveKeysJWK);
  } else {
    throw new Error(
      "Env ARWEAVE_KEYS_FILE_PATH or ARWEAVE_KEYS_JWK must be specified"
    );
  }
};

export const config: NodeConfig = Object.freeze({
  enableJsonLogs: parserFromString.boolean(
    getFromEnv("ENABLE_JSON_LOGS", DEFAULT_ENABLE_JSON_LOGS)
  ),
  enablePerformanceTracking: parserFromString.boolean(
    getFromEnv(
      "ENABLE_PERFORMANCE_TRACKING",
      DEFAULT_ENABLE_PERFORMANCE_TRACKING
    )
  ),
  printDiagnosticInfo: parserFromString.boolean(
    getFromEnv("PRINT_DIAGNOSTIC_INFO", DEFAULT_PRINT_DIAGNOSTIC_INFO)
  ),
  manifestRefreshInterval: parserFromString.number(
    getFromEnv("MANIFEST_REFRESH_INTERVAL", DEFAULT_MANIFEST_REFRESH_INTERVAL)
  ),
  overrideManifestUsingFile: getOptionallyManifestData(),
  credentials: {
    twelveDataRapidApiKey: getFromEnv(
      "TWELVE_DATA_RAPID_API_KEY",
      DEFAULT_TWELVE_DATA_RAPID_API_KEY
    ),
  },
  privateKeys: {
    arweaveJwk: getArweaveWallet(),
    ethereumPrivateKey: parserFromString.hex(getFromEnv("ECDSA_PRIVATE_KEY")),
  },
});

import { RedstoneCommon } from "@redstone-finance/utils";
import fs from "fs";
import path from "path";
import { z } from "zod";

const MAX_REMOTE_CONFIG_NESTING_DEPTH = 20;

export const REMOTE_CONFIG_SIGNATURES_FOLDER = "signatures";
export const NODE_REMOTE_CONFIG_FOLDER = "node-remote-config";
export const RELAYER_REMOTE_CONFIG_FOLDER = "relayer-remote-config";

export enum OracleNodeEnv {
  Dev = "dev",
  Prod = "prod",
  ProdFallback = "prod-fallback",
  ProdRedStone = "prod-redstone",
  ProdRedStoneFallback = "prod-redstone-fallback",
}

export enum RelayerNodeEnv {
  Main = "main",
  Fallback = "fallback",
}

export const ORACLE_ENVS_WITH_SIG_VERIFICATION = [
  OracleNodeEnv.Prod,
  OracleNodeEnv.ProdFallback,
];

export function isOracleNodeEnv(v: unknown): v is OracleNodeEnv {
  return (
    typeof v === "string" &&
    Object.values(OracleNodeEnv).includes(v as OracleNodeEnv)
  );
}

export function parseOracleNodeEnv(
  raw: string | undefined
): OracleNodeEnv | undefined {
  return isOracleNodeEnv(raw) ? raw : undefined;
}

export function getSignaturesRepositoryPath(nodeEnv = OracleNodeEnv.Dev) {
  const remoteConfigPath = findNodeRemoteConfigOrThrow(nodeEnv);
  return path.join(
    remoteConfigPath,
    "..",
    REMOTE_CONFIG_SIGNATURES_FOLDER,
    nodeEnv
  );
}

export const getNodeConfigBasePath = (nodeEnv = OracleNodeEnv.Dev) => {
  return RedstoneCommon.getFromEnv(
    "USE_REMOTE_CONFIG",
    z.boolean().default(false)
  )
    ? NODE_REMOTE_CONFIG_FOLDER
    : path.join(NODE_REMOTE_CONFIG_FOLDER, nodeEnv);
};

export const getRelayerConfigBasePath = () => {
  return RedstoneCommon.getFromEnv(
    "USE_RELAYER_REMOTE_CONFIG",
    z.boolean().default(false)
  )
    ? RELAYER_REMOTE_CONFIG_FOLDER
    : path.join(RELAYER_REMOTE_CONFIG_FOLDER, RelayerNodeEnv.Main);
};

export function findNodeRemoteConfigOrThrow(configType = OracleNodeEnv.Dev) {
  return findDirOrThrow(getNodeConfigBasePath(configType));
}

export function findRelayerRemoteConfigOrThrow() {
  return findDirOrThrow(getRelayerConfigBasePath());
}

export function findDirOrThrow(searchedDir: string) {
  const startDir = process.cwd();
  let dir = startDir;
  for (let i = 0; i < MAX_REMOTE_CONFIG_NESTING_DEPTH; i++) {
    const candidate = path.join(dir, searchedDir);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parentDir = path.dirname(dir);
    // root - abort
    if (parentDir === dir) {
      break;
    }
    dir = parentDir;
  }
  throw new Error(
    `Could not find ${searchedDir} directory, starting from ${startDir}`
  );
}

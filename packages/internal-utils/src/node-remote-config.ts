import { RedstoneCommon } from "@redstone-finance/utils";
import fs from "fs";
import path from "path";
import { z } from "zod";

const MAX_REMOTE_CONFIG_NESTING_DEPTH = 20;

export const REMOTE_CONFIG_SIGNATURES_FOLDER = "signatures";

export enum OracleNodeEnv {
  Dev = "dev",
  Prod = "prod",
  ProdFallback = "prod-fallback",
  ProdRedStone = "prod-redstone",
  ProdRedStoneFallback = "prod-redstone-fallback",
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
  const remoteConfigPath = findRemoteConfigOrThrow(nodeEnv);
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
    ? "node-remote-config"
    : `node-remote-config/${nodeEnv}`;
};

export function findRemoteConfigOrThrow(configType = OracleNodeEnv.Dev) {
  const startDir = process.cwd();
  let dir = startDir;
  for (let i = 0; i < MAX_REMOTE_CONFIG_NESTING_DEPTH; i++) {
    const candidate = path.join(dir, getNodeConfigBasePath(configType));
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
    `Could not find ${getNodeConfigBasePath()} directory, starting from ${startDir}.`
  );
}

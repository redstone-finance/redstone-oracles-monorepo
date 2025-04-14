import { RedstoneCommon } from "@redstone-finance/utils";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const MAX_FETCHER_CONFIG_NESTING_DEPTH = 20;

export const getNodeConfigBasePath = () => {
  return RedstoneCommon.getFromEnv(
    "USE_REMOTE_CONFIG",
    z.boolean().default(false)
  )
    ? "node-remote-config"
    : "node-remote-config/dev";
};

export function findRemoteConfigOrThrow() {
  const startDir = process.cwd();
  let dir = startDir;
  for (let i = 0; i < MAX_FETCHER_CONFIG_NESTING_DEPTH; i++) {
    const candidate = path.join(dir, getNodeConfigBasePath());
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

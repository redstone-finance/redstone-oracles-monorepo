import fs from "node:fs";
import path from "node:path";

const MAX_FETCHER_CONFIG_NESTING_DEPTH = 20;

export const NODE_CONFIG_BASE_PATH = "node-remote-config/dev";

export function findRemoteConfigOrThrow() {
  const startDir = process.cwd();
  let dir = startDir;
  for (let i = 0; i < MAX_FETCHER_CONFIG_NESTING_DEPTH; i++) {
    const candidate = path.join(dir, NODE_CONFIG_BASE_PATH);
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
    `Could not find ${NODE_CONFIG_BASE_PATH} directory, starting from ${startDir}.`
  );
}

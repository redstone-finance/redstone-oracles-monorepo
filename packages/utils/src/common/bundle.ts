import { path } from "./fs-path-safe";

// set by the intro of every rollup bundle, see rollup.config.mjs
const bundleGlobalThis = globalThis as { __REDSTONE_BUNDLE_DIR__?: string };

/**
 * Directory of the running rollup bundle, undefined when running unbundled (tsc output, tsx).
 */
export const getBundleDir = (): string | undefined => bundleGlobalThis.__REDSTONE_BUNDLE_DIR__;

/**
 * Path of a script to spawn as a worker thread / child process.
 *
 * All bundles of a package are emitted flat into a single directory (bundle/ locally,
 * the workdir in docker images), so a bundled script lies next to the running bundle.
 * Unbundled runs use the tsc output path (relative paths are resolved against the cwd,
 * i.e. the package root).
 */
export const resolveWorkerScriptPath = (bundledFileName: string, unbundledPath: string): string => {
  const bundleDir = getBundleDir();

  return bundleDir ? path.join(bundleDir, bundledFileName) : unbundledPath;
};

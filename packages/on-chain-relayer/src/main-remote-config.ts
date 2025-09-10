import "dotenv/config";
// note: this line is intentional, otherwise linter changes the order of imports
// dotenv/config MUST be a very first import.
import { RedstoneRemoteConfig } from "@redstone-finance/remote-config";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { GitHubConfigLoader } from "./config/GitHubConfigLoader";

const relayerEnv =
  RedstoneCommon.getFromEnv("FALLBACK_OFFSET_IN_MILLISECONDS", z.number().int()) > 0
    ? RedstoneRemoteConfig.RelayerNodeEnv.Fallback
    : RedstoneRemoteConfig.RelayerNodeEnv.Main;

const supervisorProcess = new RedstoneRemoteConfig.RemoteConfigSupervisor({
  useRemoteConfig: RedstoneCommon.getFromEnv(
    "USE_RELAYER_REMOTE_CONFIG",
    z.boolean().default(false)
  ),
  verifyRemoteConfigSignatures: false,
  trustedRemoteConfigSigners: [],
  minRequiredConfigSignatures: 0,
  configUpdateIntervalMs: RedstoneCommon.getFromEnv(
    "CONFIG_UPDATE_INTERVAL_MS",
    // note: default github rate limit is 60 requests / h
    z.number().min(120_000).default(120_000)
  ),
  configLoader: () =>
    new GitHubConfigLoader(
      RedstoneCommon.getFromEnv(
        "RELAYER_REMOTE_CONFIG_REPOSITORY",
        z.string().default("redstone-finance/redstone-oracles-monorepo")
      ),
      RedstoneCommon.getFromEnv("RELAYER_REMOTE_CONFIG_BRANCH", z.string().default("main")),
      RedstoneCommon.getFromEnv(
        "RELAYER_REMOTE_CONFIG_REPOSITORY_PATH",
        z.string().default(`packages/relayer-remote-config/${relayerEnv}`)
      ),
      RedstoneCommon.getFromEnv("MANIFEST_FILE", z.string())
    ),
  childProcessPath: "dist/relayer-worker.js",
  configBasePath: RedstoneRemoteConfig.getRelayerConfigBasePath(),
  backupConfigSourceFolder: relayerEnv,
});

void supervisorProcess.startChildProcess();

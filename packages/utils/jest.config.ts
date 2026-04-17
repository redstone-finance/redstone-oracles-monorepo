import type { Config } from "@jest/types";
import redstoneConfig from "@redstone-finance/jest-config";

const config: Config.InitialOptions = {
  ...redstoneConfig,
  setupFiles: ["<rootDir>/.jest/set-redstone-number-config.ts"],
};

export default config;

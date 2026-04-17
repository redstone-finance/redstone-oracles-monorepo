import type { Config } from "@jest/types";
import redstoneConfig from "@redstone-finance/jest-config";

const config: Config.InitialOptions = {
  ...redstoneConfig,
  setupFilesAfterEnv: ["./jest.setup-after-env.js"],
};

export default config;

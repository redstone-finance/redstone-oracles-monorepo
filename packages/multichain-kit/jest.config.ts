import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
};

export default config;

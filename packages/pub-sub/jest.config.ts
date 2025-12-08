import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.(t|j)s"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["html"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  preset: "ts-jest",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
};

export default config;

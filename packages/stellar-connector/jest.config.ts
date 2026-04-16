import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.(t|j)s"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["html"],
  preset: "ts-jest",
  transformIgnorePatterns: [
    "node_modules/(?!@creit-tech/stellar-router-sdk)",
    "prices-contract-binary.js",
  ],
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules/@creit-tech/.+\\.js$": "ts-jest",
  },
};

export default config;

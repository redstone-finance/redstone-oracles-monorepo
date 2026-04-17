import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.(t|j)s"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["html"],
  preset: "ts-jest",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.m?js$": "@swc/jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@mysten|@scure|@noble|@creit-tech/stellar-router-sdk)/)",
  ],
};

export default config;

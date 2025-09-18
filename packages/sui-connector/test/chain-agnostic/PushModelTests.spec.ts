import { fullTestsSpec, generatePushTestsFor } from "@redstone-finance/chain-agnostic-oracle-tests";
import { getTestEnvFunction } from "./TestEnvironment";

describe("SUI", () => {
  jest.setTimeout(300_000);

  generatePushTestsFor(
    getTestEnvFunction(),
    "Chain Agnostic Push Model Tests",
    fullTestsSpec["Push model"],
    ["Should fail for stale data", "Should fail for missing data"]
  );
});

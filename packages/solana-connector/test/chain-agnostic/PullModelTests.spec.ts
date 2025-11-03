import { fullTestsSpec, generatePullTestsFor } from "@redstone-finance/chain-agnostic-oracle-tests";
import { getTestEnvFunction } from "./TestEnvironment";

describe("Solana", () => {
  jest.setTimeout(300_000);

  generatePullTestsFor(
    getTestEnvFunction(),
    "Chain Agnostic Pull Model Tests",
    fullTestsSpec["Pull model"],
    ["Additional valid data packages"]
  );
});

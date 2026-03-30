import type { NodeManifest } from "@redstone-finance/internal-utils";

const mockFetchNodeManifest = jest.fn<Promise<NodeManifest>, [string, string[]]>();

jest.mock("@redstone-finance/internal-utils", () => ({
  ...jest.requireActual<object>("@redstone-finance/internal-utils"),
  fetchNodeManifest: (...args: [string, string[]]) => mockFetchNodeManifest(...args),
}));

jest.mock("../src/config", () => ({
  __esModule: true,
  default: { env: "dev" },
}));

// Must import after mocks
import { RwaFeedIdsProvider } from "../src/utils/strip-rwa-metadata";

const makeManifest = (tokens: Record<string, { types?: string[] }>): NodeManifest => ({
  tokens,
  interval: 10000,
  defaultSource: ["test"],
});

describe("RwaFeedIdsProvider", () => {
  let provider: RwaFeedIdsProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new RwaFeedIdsProvider();
  });

  afterEach(() => {
    provider.stop();
  });

  it("returns empty set for redstone-rwa-* data services (no agents needed)", () => {
    const result = provider.getRwaFeedIds("redstone-rwa-demo");
    expect(result).toEqual(new Set());
    expect(mockFetchNodeManifest).not.toHaveBeenCalled();
  });

  it("returns set of RWA feed IDs from manifest after start", async () => {
    mockFetchNodeManifest.mockResolvedValue(
      makeManifest({
        ETH: { types: ["crypto"] },
        "USDY/USD": { types: ["rwa"] },
        "ONDO/USD": { types: ["rwa", "governance"] },
        BTC: {},
      })
    );

    await provider.start();

    const result = provider.getRwaFeedIds("redstone-primary-demo");
    expect(result).toEqual(new Set(["USDY/USD", "ONDO/USD"]));
    expect(mockFetchNodeManifest).toHaveBeenCalledWith("redstone-primary-demo", [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
    ]);
  });

  it("returns empty set for unknown data service", () => {
    const result = provider.getRwaFeedIds("unknown-service");
    expect(result).toEqual(new Set());
    expect(mockFetchNodeManifest).not.toHaveBeenCalled();
  });

  it("resolves hip3 data service via hardcoded URLs", async () => {
    mockFetchNodeManifest.mockResolvedValue(makeManifest({ "RWA_TOKEN/USD": { types: ["rwa"] } }));

    await provider.start();

    const result = provider.getRwaFeedIds("redstone-hip3-demo");
    expect(result).toEqual(new Set(["RWA_TOKEN/USD"]));
    expect(mockFetchNodeManifest).toHaveBeenCalledWith("redstone-hip3-demo", [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
    ]);
  });

  it("returns undefined when agent start fails (fail-closed)", async () => {
    mockFetchNodeManifest.mockRejectedValue(new Error("network error"));

    await provider.start();

    const result = provider.getRwaFeedIds("redstone-primary-demo");
    expect(result).toBeUndefined();
  });
});

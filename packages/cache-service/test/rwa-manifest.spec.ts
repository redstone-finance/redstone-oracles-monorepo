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
import { getRwaFeedIds } from "../src/utils/strip-rwa-metadata";

const makeManifest = (tokens: Record<string, { types?: string[] }>): NodeManifest => ({
  tokens,
  interval: 10000,
  defaultSource: ["test"],
});

// Use unique dataServiceId per test to avoid memoize cache collisions
describe("getRwaFeedIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "ALL" for redstone-rwa-* data services', async () => {
    const result = await getRwaFeedIds("redstone-rwa-demo");
    expect(result).toBe("ALL");
    expect(mockFetchNodeManifest).not.toHaveBeenCalled();
  });

  it("returns set of RWA feed IDs from manifest", async () => {
    mockFetchNodeManifest.mockResolvedValue(
      makeManifest({
        ETH: { types: ["crypto"] },
        "USDY/USD": { types: ["rwa"] },
        "ONDO/USD": { types: ["rwa", "governance"] },
        BTC: {},
      })
    );

    const result = await getRwaFeedIds("redstone-primary-demo");

    expect(result).toEqual(new Set(["USDY/USD", "ONDO/USD"]));
    expect(mockFetchNodeManifest).toHaveBeenCalledWith("redstone-primary-demo", [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/primary.json",
    ]);
  });

  it("returns empty set for unknown data service", async () => {
    const result = await getRwaFeedIds("unknown-service");
    expect(result).toEqual(new Set());
    expect(mockFetchNodeManifest).not.toHaveBeenCalled();
  });

  it("resolves hip3 data service via hardcoded URLs", async () => {
    mockFetchNodeManifest.mockResolvedValue(makeManifest({ "RWA_TOKEN/USD": { types: ["rwa"] } }));

    const result = await getRwaFeedIds("redstone-hip3-demo");

    expect(result).toEqual(new Set(["RWA_TOKEN/USD"]));
    expect(mockFetchNodeManifest).toHaveBeenCalledWith("redstone-hip3-demo", [
      "https://d3cu28sut4ahjk.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
      "https://d13fu63cj82rby.cloudfront.net/redstone-finance/redstone-monorepo-priv/${main}/packages/node-remote-config/dev/manifests/data-services/hip3-testnet.json",
    ]);
  });

  it("retries on fetch failure (fail-open)", async () => {
    mockFetchNodeManifest.mockRejectedValueOnce(new Error("network error"));

    await expect(getRwaFeedIds("redstone-arbitrum-demo")).rejects.toThrow("network error");

    // Next call should retry (memoize deletes cache entry on error)
    mockFetchNodeManifest.mockResolvedValueOnce(makeManifest({ "RWA/USD": { types: ["rwa"] } }));

    const result = await getRwaFeedIds("redstone-arbitrum-demo");
    expect(result).toEqual(new Set(["RWA/USD"]));
  });
});

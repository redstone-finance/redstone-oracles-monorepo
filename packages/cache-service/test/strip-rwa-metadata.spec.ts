import { DataPackagesResponse } from "../src/data-packages/data-packages.interface";
import { RwaFeedResult, stripRwaMetadata } from "../src/utils/strip-rwa-metadata";

const makeResponse = (
  entries: Record<
    string,
    Array<{
      dataPoints: Array<{ dataFeedId: string; value: string; metadata?: Record<string, unknown> }>;
    }>
  >
): DataPackagesResponse => {
  const result: DataPackagesResponse = {};
  for (const [key, packages] of Object.entries(entries)) {
    result[key] = packages.map((pkg) => ({
      timestampMilliseconds: 1000,
      signature: "sig",
      isSignatureValid: true,
      dataPoints: pkg.dataPoints,
      dataServiceId: "test",
      dataPackageId: key,
      signerAddress: "0x1",
    }));
  }
  return result;
};

describe("stripRwaMetadata", () => {
  it("strips metadata from RWA feeds only", () => {
    const response = makeResponse({
      RWA_FEED: [
        {
          dataPoints: [
            { dataFeedId: "RWA_FEED", value: "100", metadata: { sources: { ex: "100" } } },
          ],
        },
      ],
      ETH: [
        {
          dataPoints: [{ dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } }],
        },
      ],
    });

    const rwaFeedIds: RwaFeedResult = new Set(["RWA_FEED"]);
    const result = stripRwaMetadata(response, rwaFeedIds);

    expect(result.RWA_FEED![0].dataPoints[0].metadata).toBeUndefined();
    expect(result.ETH![0].dataPoints[0].metadata).toEqual({ sources: { ex: "3000" } });
  });

  it("preserves metadata when rwaFeedIds is empty set", () => {
    const response = makeResponse({
      ETH: [
        {
          dataPoints: [{ dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } }],
        },
      ],
    });

    const result = stripRwaMetadata(response, new Set());

    expect(result).toBe(response); // same reference — no-op
    expect(result.ETH![0].dataPoints[0].metadata).toEqual({ sources: { ex: "3000" } });
  });

  it('strips all metadata when rwaFeedIds is "ALL"', () => {
    const response = makeResponse({
      ETH: [
        {
          dataPoints: [{ dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } }],
        },
      ],
      BTC: [
        {
          dataPoints: [
            { dataFeedId: "BTC", value: "50000", metadata: { sources: { ex: "50000" } } },
          ],
        },
      ],
    });

    const result = stripRwaMetadata(response, "ALL");

    expect(result.ETH![0].dataPoints[0].metadata).toBeUndefined();
    expect(result.BTC![0].dataPoints[0].metadata).toBeUndefined();
  });

  it("handles ___ALL_FEEDS___ multi-point packages (per-dataPoint check)", () => {
    const response = makeResponse({
      ___ALL_FEEDS___: [
        {
          dataPoints: [
            { dataFeedId: "RWA_FEED", value: "100", metadata: { sources: { ex: "100" } } },
            { dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } },
          ],
        },
      ],
    });

    const rwaFeedIds: RwaFeedResult = new Set(["RWA_FEED"]);
    const result = stripRwaMetadata(response, rwaFeedIds);

    const points = result["___ALL_FEEDS___"]![0].dataPoints;
    expect(points[0].metadata).toBeUndefined();
    expect(points[1].metadata).toEqual({ sources: { ex: "3000" } });
  });

  it("handles undefined packages in response", () => {
    const response: DataPackagesResponse = { ETH: undefined };
    const result = stripRwaMetadata(response, "ALL");
    expect(result.ETH).toBeUndefined();
  });
});

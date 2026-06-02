import { DataPackagesResponse } from "../src/data-packages/data-packages.interface";
import { stripRwaMetadata } from "../src/utils/strip-rwa-metadata";

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
            {
              dataFeedId: "RWA_FEED",
              value: "100",
              metadata: {
                nodeLabel: "node-1",
                value: "100",
                sourceMetadata: {
                  exchange_1: { value: "99", slippage: [{ isSuccess: true }] },
                  exchange_2: { value: "101" },
                },
              },
            },
          ],
        },
      ],
      ETH: [
        {
          dataPoints: [{ dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } }],
        },
      ],
    });

    const result = stripRwaMetadata(response, new Set(["RWA_FEED"]));

    expect(result.RWA_FEED![0].dataPoints[0].metadata).toEqual({ nodeLabel: "node-1" });
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

    expect(result).toEqual(response);
    expect(result.ETH![0].dataPoints[0].metadata).toEqual({ sources: { ex: "3000" } });
  });

  it("handles ___ALL_FEEDS___ multi-point packages (per-dataPoint check)", () => {
    const response = makeResponse({
      ___ALL_FEEDS___: [
        {
          dataPoints: [
            {
              dataFeedId: "RWA_FEED",
              value: "100",
              metadata: {
                nodeLabel: "node-1",
                sourceMetadata: { ex: { value: "100" } },
              },
            },
            { dataFeedId: "ETH", value: "3000", metadata: { sources: { ex: "3000" } } },
          ],
        },
      ],
    });

    const result = stripRwaMetadata(response, new Set(["RWA_FEED"]));

    const points = result["___ALL_FEEDS___"]![0].dataPoints;
    expect(points[0].metadata).toEqual({ nodeLabel: "node-1" });
    expect(points[1].metadata).toEqual({ sources: { ex: "3000" } });
  });

  it("handles undefined packages in response", () => {
    const response: DataPackagesResponse = { ETH: undefined };
    const result = stripRwaMetadata(response, new Set(["ETH"]));
    expect(result.ETH).toBeUndefined();
  });

  it("strips all fields except nodeLabel", () => {
    const response = makeResponse({
      RWA_FEED: [
        {
          dataPoints: [
            {
              dataFeedId: "RWA_FEED",
              value: "100",
              metadata: {
                nodeLabel: "node-1",
                value: "100",
                sourceMetadata: { exchange_1: { value: "99.5" } },
              },
            },
          ],
        },
      ],
    });

    const result = stripRwaMetadata(response, new Set(["RWA_FEED"]));
    const meta = result.RWA_FEED![0].dataPoints[0].metadata as Record<string, unknown>;

    expect(meta).toEqual({ nodeLabel: "node-1" });
  });

  it("leaves metadata undefined when RWA data point has no metadata", () => {
    const response = makeResponse({
      RWA_FEED: [
        {
          dataPoints: [{ dataFeedId: "RWA_FEED", value: "100" }],
        },
      ],
    });

    const result = stripRwaMetadata(response, new Set(["RWA_FEED"]));

    expect(result.RWA_FEED![0].dataPoints[0].metadata).toBeUndefined();
  });
});

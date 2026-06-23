import { expect } from "chai";
import { RelayerConfig } from "../../../src/config/RelayerConfig";
import { includeSynchronizedHeartbeatUpdates } from "../../../src/multi-feed/gas-optimization/heartbeat-sync";

const mockConfig = (overrides: Partial<RelayerConfig> = {}): RelayerConfig =>
  ({
    dataFeeds: ["ETH", "BTC"],
    updateTriggers: {
      ETH: { timeSinceLastUpdateInMilliseconds: 3000 },
      BTC: { timeSinceLastUpdateInMilliseconds: 6000 },
    },
    ...overrides,
  }) as unknown as RelayerConfig;

describe("includeSynchronizedHeartbeatUpdates", () => {
  it("should return empty result when multiFeedSyncHeartbeats is not set", () => {
    const result = includeSynchronizedHeartbeatUpdates([], [3000], mockConfig());
    expect(result.extraFeedsFromHeartbeat).to.deep.equal([]);
    expect(result.message).to.equal("");
  });

  it("should return empty result when multiFeedSyncHeartbeats is false", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: false });
    const result = includeSynchronizedHeartbeatUpdates([], [3000], config);
    expect(result.extraFeedsFromHeartbeat).to.deep.equal([]);
    expect(result.message).to.equal("");
  });

  it("should return empty result when all heartbeat values are 0", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates([], [0, 0], config);
    expect(result.extraFeedsFromHeartbeat).to.deep.equal([]);
    expect(result.message).to.equal("");
  });

  it("should skip feeds already in dataFeedsToUpdate", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates(["ETH"], [3000], config);
    expect(result.extraFeedsFromHeartbeat).not.to.include("ETH");
  });

  it("should skip feeds without timeSinceLastUpdateInMilliseconds", () => {
    const config = mockConfig({
      multiFeedSyncHeartbeats: true,
      dataFeeds: ["ETH", "BTC"],
      updateTriggers: {
        ETH: {},
        BTC: { timeSinceLastUpdateInMilliseconds: 6000 },
      },
    });
    const result = includeSynchronizedHeartbeatUpdates([], [3000], config);
    expect(result.extraFeedsFromHeartbeat).not.to.include("ETH");
  });

  it("should include feed when heartbeat is an exact multiple of timeSinceLastUpdateInMilliseconds", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates([], [6000], config);
    expect(result.extraFeedsFromHeartbeat).to.include("ETH");
    expect(result.message).to.include("ETH");
  });

  it("should include feed when timeSinceLastUpdateInMilliseconds is 0 (always sync)", () => {
    const config = mockConfig({
      multiFeedSyncHeartbeats: true,
      updateTriggers: {
        ETH: { timeSinceLastUpdateInMilliseconds: 0 },
        BTC: { timeSinceLastUpdateInMilliseconds: 6000 },
      },
    });
    const result = includeSynchronizedHeartbeatUpdates([], [3000], config);
    expect(result.extraFeedsFromHeartbeat).to.include("ETH");
  });

  it("should not include feed when heartbeat is not a multiple of timeSinceLastUpdateInMilliseconds", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates([], [4000], config);
    expect(result.extraFeedsFromHeartbeat).not.to.include("ETH");
  });

  it("should include each qualifying feed at most once even with multiple matching heartbeats", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates([], [3000, 6000], config);
    const ethOccurrences = result.extraFeedsFromHeartbeat.filter((f) => f === "ETH").length;
    expect(ethOccurrences).to.equal(1);
  });

  it("should not mutate the original dataFeedsToUpdate array", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const feeds = ["ETH"];
    includeSynchronizedHeartbeatUpdates(feeds, [3000], config);
    expect(feeds).to.deep.equal(["ETH"]);
  });

  it("should handle mixed heartbeat list with some zeros", () => {
    const config = mockConfig({ multiFeedSyncHeartbeats: true });
    const result = includeSynchronizedHeartbeatUpdates([], [0, 6000], config);
    expect(result.extraFeedsFromHeartbeat).to.include("BTC");
  });
});

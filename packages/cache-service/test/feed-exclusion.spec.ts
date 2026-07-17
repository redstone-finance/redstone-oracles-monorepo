import { isFeedExcluded } from "../src/data-packages/feed-exclusion";

describe("isFeedExcluded", () => {
  it("returns false when there are no exclusion patterns", () => {
    expect(isFeedExcluded("BTC", [])).toBe(false);
  });

  it("matches an exact feed id", () => {
    expect(isFeedExcluded("BTC", ["BTC"])).toBe(true);
    expect(isFeedExcluded("ETH", ["BTC"])).toBe(false);
  });

  it("does not treat an exact pattern as a substring match", () => {
    expect(isFeedExcluded("BTC", ["BT"])).toBe(false);
    expect(isFeedExcluded("wBTC", ["BTC"])).toBe(false);
  });

  it("matches `*XYZ` using endsWith", () => {
    expect(isFeedExcluded("wstETH", ["*ETH"])).toBe(true);
    expect(isFeedExcluded("ETH", ["*ETH"])).toBe(true);
    expect(isFeedExcluded("ETHx", ["*ETH"])).toBe(false);
  });

  it("matches `XYZ*` using startsWith", () => {
    expect(isFeedExcluded("BTC_TEST", ["BTC*"])).toBe(true);
    expect(isFeedExcluded("BTC", ["BTC*"])).toBe(true);
    expect(isFeedExcluded("xBTC", ["BTC*"])).toBe(false);
  });

  it("matches if any of the patterns matches", () => {
    const patterns = ["BTC", "*ETH", "USD*"];
    expect(isFeedExcluded("BTC", patterns)).toBe(true);
    expect(isFeedExcluded("wstETH", patterns)).toBe(true);
    expect(isFeedExcluded("USDC", patterns)).toBe(true);
    expect(isFeedExcluded("SOL", patterns)).toBe(false);
  });
});

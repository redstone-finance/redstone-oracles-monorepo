import { getFeedId } from "../src/sep-40-asset-symbols";

describe("getFeedId", () => {
  it("keeps a usd-denominated asset symbol", () => {
    expect(getFeedId("USDC", "USD")).toBe("USDC");
    expect(getFeedId("GILTS", "USD")).toBe("GILTS");
  });

  it("maps an asset symbol differing from our feed id", () => {
    expect(getFeedId("native", "USD")).toBe("XLM");
    expect(getFeedId("EURC", "USD")).toBe("EUROC");
    expect(getFeedId("SUSDE", "USD")).toBe("sUSDe");
  });

  it("maps a fundamental feed by its asset symbol", () => {
    expect(getFeedId("USDY", "USD")).toBe("USDY_FUNDAMENTAL/USD");
    expect(getFeedId("xSolvBTC", "USD")).toBe("SolvBTC.BBN_FUNDAMENTAL/USD");
    expect(getFeedId("deJTRSY", "USD")).toBe("deJTRSY_FUNDAMENTAL/USD");
  });

  it("maps a pair denominated in something other than usd", () => {
    expect(getFeedId("savUSD", "avUSD")).toBe("savUSD_FUNDAMENTAL");
  });

  it("keeps an unmapped non-usd pair as is", () => {
    expect(getFeedId("SolvBTC", "BTC")).toBe("SolvBTC/BTC");
  });

  it("does not reuse a usd mapping for another denomination", () => {
    expect(getFeedId("USDY", "avUSD")).toBe("USDY/avUSD");
  });
});

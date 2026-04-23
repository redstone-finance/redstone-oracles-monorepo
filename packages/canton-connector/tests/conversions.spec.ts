import {
  convertDecimalValue,
  decodeFeedId,
  getArrayifiedFeedId,
  REDSTONE_DECIMALS,
} from "../src/utils/conversions";

const SCALE = 10n ** BigInt(REDSTONE_DECIMALS);

describe("convertDecimalValue", () => {
  it("scales BTC ($75_000) by 10^8", () => {
    expect(convertDecimalValue("75000")).toBe(75_000n * SCALE);
  });

  it("scales ETH ($25_000) by 10^8", () => {
    expect(convertDecimalValue("25000")).toBe(25_000n * SCALE);
  });

  it("scales a sub-dollar CC price ($0.15) to 15_000_000", () => {
    expect(convertDecimalValue("0.15")).toBe(15_000_000n);
  });

  it("handles zero", () => {
    expect(convertDecimalValue("0")).toBe(0n);
  });

  it("handles negative values", () => {
    expect(convertDecimalValue("-1")).toBe(-SCALE);
  });

  it("preserves precision up to 10^-8", () => {
    expect(convertDecimalValue("0.00000001")).toBe(1n);
  });
});

describe("feed id encoding", () => {
  it("arrayifies ETH into its UTF-8 byte codes", () => {
    expect(getArrayifiedFeedId("ETH")).toEqual([69, 84, 72]);
  });

  it("arrayifies BTC into its UTF-8 byte codes", () => {
    expect(getArrayifiedFeedId("BTC")).toEqual([66, 84, 67]);
  });

  it("arrayifies CC into its UTF-8 byte codes", () => {
    expect(getArrayifiedFeedId("CC")).toEqual([67, 67]);
  });

  it.each(["ETH", "BTC", "CC"])("round-trips %s through decodeFeedId", (feedId) => {
    const arrayified = getArrayifiedFeedId(feedId);
    expect(decodeFeedId(arrayified.map(String))).toBe(feedId);
  });

  it("strips trailing zero padding when decoding", () => {
    const padded = [...getArrayifiedFeedId("ETH"), 0, 0, 0, 0, 0];
    expect(decodeFeedId(padded.map(String))).toBe("ETH");
  });
});

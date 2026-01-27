import { durationToMilliseconds } from "../../src/common/zod-helpers";

describe("durationToMilliseconds", () => {
  it("converts seconds to milliseconds", () => {
    expect(durationToMilliseconds("1s")).toBe(1000);
    expect(durationToMilliseconds("30s")).toBe(30000);
    expect(durationToMilliseconds("0s")).toBe(0);
  });

  it("converts minutes to milliseconds", () => {
    expect(durationToMilliseconds("1m")).toBe(60000);
    expect(durationToMilliseconds("5m")).toBe(300000);
  });

  it("converts hours to milliseconds", () => {
    expect(durationToMilliseconds("1h")).toBe(3600000);
    expect(durationToMilliseconds("2h")).toBe(7200000);
  });

  it("converts days to milliseconds", () => {
    expect(durationToMilliseconds("1d")).toBe(86400000);
    expect(durationToMilliseconds("3d")).toBe(259200000);
  });

  it("throws error for invalid duration format", () => {
    expect(() => durationToMilliseconds("5")).toThrow("Invalid duration format");
    expect(() => durationToMilliseconds("abc")).toThrow("Invalid duration format");
    expect(() => durationToMilliseconds("1x")).toThrow("Invalid duration format");
    expect(() => durationToMilliseconds("1 s")).toThrow("Invalid duration format");
    expect(() => durationToMilliseconds("1.5s")).toThrow("Invalid duration format");
    expect(() => durationToMilliseconds("-1s")).toThrow("Invalid duration format");
  });

  describe("Capital letters", () => {
    it("converts seconds to milliseconds", () => {
      expect(durationToMilliseconds("1S")).toBe(1000);
      expect(durationToMilliseconds("30S")).toBe(30000);
      expect(durationToMilliseconds("0S")).toBe(0);
    });

    it("converts minutes to milliseconds", () => {
      expect(durationToMilliseconds("1M")).toBe(60000);
      expect(durationToMilliseconds("5M")).toBe(300000);
    });

    it("converts hours to milliseconds", () => {
      expect(durationToMilliseconds("1H")).toBe(3600000);
      expect(durationToMilliseconds("2H")).toBe(7200000);
    });

    it("converts days to milliseconds", () => {
      expect(durationToMilliseconds("1D")).toBe(86400000);
      expect(durationToMilliseconds("3D")).toBe(259200000);
    });
  });
});

import { CacheWithTtl } from "../../src/common/CacheWithTtl";

describe("CacheWithTtl", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return undefined for missing keys", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    expect(cache.get("missing")).toBeUndefined();
  });

  it("should return stored values within ttl", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
  });

  it("should overwrite previous values", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    cache.set("a", 2);

    expect(cache.get("a")).toBe(2);
  });

  it("should return undefined after ttl expires", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    jest.advanceTimersByTime(1000);

    expect(cache.get("a")).toBeUndefined();
  });

  it("should still return value just before ttl expires", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    jest.advanceTimersByTime(999);

    expect(cache.get("a")).toBe(1);
  });

  it("should refresh ttl on set", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    jest.advanceTimersByTime(800);
    cache.set("a", 2);
    jest.advanceTimersByTime(800);

    expect(cache.get("a")).toBe(2);
  });

  it("should expire entries independently", () => {
    const cache = new CacheWithTtl<string, number>(1000);

    cache.set("a", 1);
    jest.advanceTimersByTime(500);
    cache.set("b", 2);
    jest.advanceTimersByTime(600);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });
});

import { memoizeSync } from "../../src/common";

describe("memoizeSync", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should call function once within ttl", () => {
    const fn = jest.fn().mockReturnValue(42);
    const memoized = memoizeSync({ functionToMemoize: fn, ttl: 1000 });

    expect(memoized()).toBe(42);
    expect(memoized()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("should re-call function after ttl expires", () => {
    const fn = jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(2);
    const memoized = memoizeSync({ functionToMemoize: fn, ttl: 1000 });

    expect(memoized()).toBe(1);
    jest.advanceTimersByTime(1001);
    expect(memoized()).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("should cache by args using default key builder", () => {
    const fn = jest.fn((x: number) => x * 2);
    const memoized = memoizeSync({ functionToMemoize: fn, ttl: 1000 });

    expect(memoized(3)).toBe(6);
    expect(memoized(4)).toBe(8);
    expect(memoized(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("should use custom cacheKeyBuilder", () => {
    const fn = jest.fn((obj: { id: number }) => obj.id);
    const memoized = memoizeSync({
      functionToMemoize: fn,
      ttl: 1000,
      cacheKeyBuilder: (obj) => String(obj.id),
    });

    expect(memoized({ id: 1 })).toBe(1);
    expect(memoized({ id: 1 })).toBe(1);
    expect(memoized({ id: 2 })).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("should clean stale entries per cleanEveryNIteration", () => {
    const fn = jest.fn().mockReturnValue(0);
    const memoized = memoizeSync({
      functionToMemoize: fn,
      ttl: 500,
      cleanEveryNIteration: 2,
    });

    memoized();
    jest.advanceTimersByTime(600);
    memoized(); // triggers clean on 2nd call (iteration 0), then re-fetches
    memoized();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

import { getOrSet } from "../../src/common/maps";

const KEY = "key";
const STORED_ZERO = 0;
const BUILT = 7;

describe("getOrSet", () => {
  it("returns the stored value, even a falsy one, without building a new one", () => {
    const map = new Map([[KEY, STORED_ZERO]]);
    const build = jest.fn(() => BUILT);

    expect(getOrSet(map, KEY, build)).toBe(STORED_ZERO);
    expect(build).not.toHaveBeenCalled();
  });

  it("builds, stores and returns the value of a missing key", () => {
    const map = new Map<string, number>();

    expect(getOrSet(map, KEY, () => BUILT)).toBe(BUILT);
    expect(map.get(KEY)).toBe(BUILT);
  });
});

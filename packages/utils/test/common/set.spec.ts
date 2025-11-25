import { isSubsetOf } from "../../src/common";

describe("isSubsetOf tests", () => {
  it("should return true if subset is contained in superset", () => {
    const superset = new Set(["a", "b", "c"]);
    const subset = new Set(["a", "b"]);

    expect(isSubsetOf(superset, subset)).toBe(true);
  });

  it("should return true if subset is empty", () => {
    const superset = new Set(["a", "b", "c"]);
    const subset = new Set();

    expect(isSubsetOf(superset, subset)).toBe(true);
  });

  it("should return false if subset is not contained in superset", () => {
    const superset = new Set(["a", "b"]);
    const subset = new Set(["a", "c"]);

    expect(isSubsetOf(superset, subset)).toBe(false);
  });

  it("should return false if superset is empty", () => {
    const superset = new Set([]);
    const subset = new Set(["a", "c"]);

    expect(isSubsetOf(superset, subset)).toBe(false);
  });
});

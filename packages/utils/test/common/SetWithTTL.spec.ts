import { SetWithTTL } from "../../src/common/SetWithTTL";

describe("SetWithTTL", () => {
  it("should add items", () => {
    const set = new SetWithTTL();

    set.add("1", 1);
    set.add("2", 1);
    set.add("1", 1);

    expect(set.size).toBe(2);
    expect(set.has("1")).toBe(true);
    expect(set.has("2")).toBe(true);
    expect(set.has("3")).toBe(false);
  });

  it("should remove old items", () => {
    const set = new SetWithTTL();

    set.add("1", 1);
    set.add("2", 1);
    set.add("3", 3);

    expect(set.size).toBe(3);

    set.removeOlderThen(3);
    expect(set.size).toBe(1);
    expect(set.has("3")).toBe(true);
    expect(set.has("1")).toBe(false);
    expect(set.has("2")).toBe(false);
  });
});

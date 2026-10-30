import { clamp, safelyConvertAnyValueToNumber } from "../../src/common/numbers";

describe("utils/numbers", () => {
  describe("safelyConvertAnyValueToNumber", () => {
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision -- add reason here, please
    const numbersToCheck = [42, 4212312, 0, -1, 12342.323423123221];

    it("Should properly convert strings to numbers", () => {
      for (const num of numbersToCheck) {
        const convertedNum = safelyConvertAnyValueToNumber(String(num));
        expect(convertedNum).toBe(num);
      }
    });

    it("Should properly convert numbers to numbers", () => {
      for (const num of numbersToCheck) {
        const convertedNum = safelyConvertAnyValueToNumber(num);
        expect(convertedNum).toBe(num);
      }
    });

    it("Should return NaN for not string or valid numbers", () => {
      const nanValues = [NaN, null, undefined, false, true, {}, { haha: 12 }, [3, 2, 4]];
      for (const nanValue of nanValues) {
        expect(safelyConvertAnyValueToNumber(nanValue)).toBe(NaN);
      }
    });
  });

  describe("clamp", () => {
    it("returns the value when it is within bounds", () => {
      expect(clamp(1, 2, 3)).toBe(2);
    });

    it("returns min when the value is below it", () => {
      expect(clamp(1, 0, 3)).toBe(1);
    });

    it("returns max when the value is above it", () => {
      expect(clamp(1, 4, 3)).toBe(3);
    });

    it("returns the bound when the value equals it", () => {
      expect(clamp(1, 1, 3)).toBe(1);
      expect(clamp(1, 3, 3)).toBe(3);
    });
  });
});

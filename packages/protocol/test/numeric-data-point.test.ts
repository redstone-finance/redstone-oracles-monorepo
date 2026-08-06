import { BigNumber } from "@ethersproject/bignumber";
import { formatUnits } from "@ethersproject/units";
import { consts, NumericDataPoint } from "../src";

const valueCarriedInBytes = (dataPoint: NumericDataPoint, decimals: number) =>
  Number(formatUnits(BigNumber.from(dataPoint.value), decimals));

describe("Numeric data point", () => {
  test("Should throw an error for numeric data point with too large value size", () => {
    expect(
      () =>
        new NumericDataPoint({
          dataFeedId: "BTC",
          value: 42000,
          valueByteSize: 33,
        })
    ).toThrow("Assertion failed: The byte size of the numeric value cannot be greater than 32");
  });

  describe("toObj", () => {
    test("Should keep the value the payload carries, dropping the float tail", () => {
      const cases = [
        { value: 0.0008391254839999999, published: 0.00083913 },
        { value: 3300.0000000000005, published: 3300 },
        { value: 0.1 + 0.2, published: 0.3 },
        { value: 2450.15, published: 2450.15 },
        { value: 223098573.39840668, published: 223098573.39840668 },
      ];

      for (const { value, published } of cases) {
        const dataPoint = new NumericDataPoint({ dataFeedId: "TEST", value });

        expect(dataPoint.toObj().value).toBe(published);
      }
    });

    test("Should return the same value as the one decoded from the bytes", () => {
      const values = [
        0.0008391254839999999,
        3300.0000000000005,
        0.1 + 0.2,
        1e-8,
        1234.99999999,
        223098573.39840668,
      ];

      for (const value of values) {
        const dataPoint = new NumericDataPoint({ dataFeedId: "TEST", value });

        expect(dataPoint.toObj().value).toBe(
          valueCarriedInBytes(dataPoint, consts.DEFAULT_NUM_VALUE_DECIMALS)
        );
      }
    });

    test("Should respect the decimals of the data point", () => {
      const value = 0.0008391254839999999;
      const decimals = 12;
      const dataPoint = new NumericDataPoint({ dataFeedId: "TEST", value, decimals });

      expect(dataPoint.toObj().value).toBe(0.000839125484);
      expect(dataPoint.toObj().value).toBe(valueCarriedInBytes(dataPoint, decimals));
    });
  });
});

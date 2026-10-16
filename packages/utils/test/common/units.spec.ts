import { BigNumber } from "@ethersproject/bignumber";
import Decimal from "decimal.js";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  parseUnitsToBigInt,
  powerOfTen,
} from "../../src/common";

const PRICE_DECIMALS = 8;
const ETHER_DECIMALS = 18;
const SOL_DECIMALS = 9;
const LAMPORTS_IN_SOL = "1000000000";
const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const MAX_UINT256_IN_ETHER =
  "115792089237316195423570985008687907853269984665640564039457.584007913129639935";
const PRICE = "1234.56789012";
const PRICE_UNITS = "123456789012";
const SMALLEST_PRICE = "0.00000001";
const ONE_AND_ONE_WEI = "1.000000000000000001";
const OVER_PRECISE_PRICE = "1.234567891";
const OVER_PRECISE_PRICE_ERROR = "Fractional component of 1.234567891 exceeds 8 decimals";
const ONE_ETHER_IN_WEI = "1000000000000000000";
const ONE_FORMATTED = "1.0";

describe("utils/units", () => {
  describe("parseUnits", () => {
    it("should scale a fixed point string by the given decimals", () => {
      expect(parseUnits(PRICE, PRICE_DECIMALS).toString()).toBe(PRICE_UNITS);
      expect(parseUnits(SMALLEST_PRICE, PRICE_DECIMALS).toString()).toBe("1");
      expect(parseUnits("98765432.10000000", PRICE_DECIMALS).toString()).toBe("9876543210000000");
    });

    it("should return a BigNumber, like the ethers function it replaces", () => {
      const parsed = parseUnits("1.5", PRICE_DECIMALS);

      expect(BigNumber.isBigNumber(parsed)).toBe(true);
      expect(parsed.eq(BigNumber.from(150000000))).toBe(true);
      expect(parsed.toHexString()).toBe("0x08f0d180");
    });

    it("should take numbers, bigints, BigNumbers and exponential notation", () => {
      expect(parseUnits(1.5, PRICE_DECIMALS).toString()).toBe("150000000");
      expect(parseUnits(7n, PRICE_DECIMALS).toString()).toBe("700000000");
      expect(parseUnits(BigNumber.from(3), PRICE_DECIMALS).toString()).toBe("300000000");
      expect(parseUnits("1e-8", PRICE_DECIMALS).toString()).toBe("1");
      expect(parseUnits("-2.5", PRICE_DECIMALS).toString()).toBe("-250000000");
    });

    it("should keep every digit of an 18 decimal value", () => {
      expect(parseUnits(ONE_AND_ONE_WEI, ETHER_DECIMALS).toString()).toBe("1000000000000000001");
      expect(parseUnits(MAX_UINT256, 0).toString()).toBe(MAX_UINT256);
    });

    it("should reject a value with more fraction digits than decimals", () => {
      expect(() => parseUnits(OVER_PRECISE_PRICE, PRICE_DECIMALS)).toThrow(
        OVER_PRECISE_PRICE_ERROR
      );
    });

    it("should scale a Decimal by the given decimals", () => {
      expect(parseUnits(new Decimal(PRICE), PRICE_DECIMALS).toString()).toBe(PRICE_UNITS);
    });
  });

  describe("formatUnits", () => {
    it("should render the value with a fraction part", () => {
      expect(formatUnits(BigNumber.from(PRICE_UNITS), PRICE_DECIMALS)).toBe(PRICE);
      expect(formatUnits(1n, PRICE_DECIMALS)).toBe(SMALLEST_PRICE);
      expect(formatUnits("9876543210000000", PRICE_DECIMALS)).toBe("98765432.1");
    });

    it("should keep one fraction digit for whole values", () => {
      expect(formatUnits(100000000n, PRICE_DECIMALS)).toBe(ONE_FORMATTED);
      expect(formatUnits(0n, PRICE_DECIMALS)).toBe("0.0");
      expect(formatUnits(-100000000n, PRICE_DECIMALS)).toBe("-1.0");
    });

    it("should keep every digit of the largest uint256", () => {
      expect(formatUnits(MAX_UINT256, ETHER_DECIMALS)).toBe(MAX_UINT256_IN_ETHER);
    });

    it("should round trip an 18 decimal value", () => {
      expect(formatUnits(parseUnits(ONE_AND_ONE_WEI, ETHER_DECIMALS), ETHER_DECIMALS)).toBe(
        ONE_AND_ONE_WEI
      );
    });
  });

  describe("parseEther and formatEther", () => {
    it("should use 18 decimals", () => {
      expect(parseEther("1").toString()).toBe(ONE_ETHER_IN_WEI);
      expect(parseEther("0.1").toString()).toBe("100000000000000000");
      expect(formatEther(BigNumber.from(ONE_ETHER_IN_WEI))).toBe(ONE_FORMATTED);
      expect(formatEther(1500000000000000000n)).toBe("1.5");
    });
  });

  describe("lamports", () => {
    it("should convert the memora balance both ways", () => {
      const lamports = "163383546";

      expect(formatUnits(lamports, SOL_DECIMALS)).toBe("0.163383546");
      expect(parseUnits("0.163383546", SOL_DECIMALS).toString()).toBe(lamports);
      expect(parseUnits("1", SOL_DECIMALS).toString()).toBe(LAMPORTS_IN_SOL);
    });
  });

  describe("parseUnitsToBigInt", () => {
    it("should scale a Decimal by the given decimals into a bigint", () => {
      expect(parseUnitsToBigInt(new Decimal(PRICE), PRICE_DECIMALS)).toBe(BigInt(PRICE_UNITS));
      expect(parseUnitsToBigInt(new Decimal(SMALLEST_PRICE), PRICE_DECIMALS)).toBe(1n);
    });

    it("should keep every digit of a Decimal beyond the default Decimal precision", () => {
      expect(parseUnitsToBigInt(new Decimal(MAX_UINT256), 0)).toBe(BigInt(MAX_UINT256));
    });

    it("should take strings, numbers and bigints", () => {
      expect(parseUnitsToBigInt(ONE_AND_ONE_WEI, ETHER_DECIMALS)).toBe(1000000000000000001n);
      expect(parseUnitsToBigInt(1.5, PRICE_DECIMALS)).toBe(150000000n);
      expect(parseUnitsToBigInt(7n, PRICE_DECIMALS)).toBe(700000000n);
    });

    it("should reject a Decimal with more fraction digits than decimals", () => {
      expect(() => parseUnitsToBigInt(new Decimal(OVER_PRECISE_PRICE), PRICE_DECIMALS)).toThrow(
        OVER_PRECISE_PRICE_ERROR
      );
    });
  });

  describe("powerOfTen", () => {
    it("should give ten to a positive or a negative exponent exactly", () => {
      expect(powerOfTen(ETHER_DECIMALS).toFixed()).toBe(ONE_ETHER_IN_WEI);
      expect(powerOfTen(-PRICE_DECIMALS).toFixed()).toBe(SMALLEST_PRICE);
    });

    it("should build each power once", () => {
      expect(powerOfTen(PRICE_DECIMALS)).toBe(powerOfTen(PRICE_DECIMALS));
    });
  });
});

import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, formatUnits, parseEther, parseUnits } from "../../src/common/units";

const PRICE_DECIMALS = 8;
const ETHER_DECIMALS = 18;
const SOL_DECIMALS = 9;
const LAMPORTS_IN_SOL = "1000000000";
const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

describe("utils/units", () => {
  describe("parseUnits", () => {
    it("should scale a fixed point string by the given decimals", () => {
      expect(parseUnits("1234.56789012", PRICE_DECIMALS).toString()).toBe("123456789012");
      expect(parseUnits("0.00000001", PRICE_DECIMALS).toString()).toBe("1");
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
      expect(parseUnits("1.000000000000000001", ETHER_DECIMALS).toString()).toBe(
        "1000000000000000001"
      );
      expect(parseUnits(MAX_UINT256, 0).toString()).toBe(MAX_UINT256);
    });

    it("should reject a value with more fraction digits than decimals", () => {
      expect(() => parseUnits("1.234567891", PRICE_DECIMALS)).toThrow(
        "Fractional component of 1.234567891 exceeds 8 decimals"
      );
    });
  });

  describe("formatUnits", () => {
    it("should render the value with a fraction part", () => {
      expect(formatUnits(BigNumber.from("123456789012"), PRICE_DECIMALS)).toBe("1234.56789012");
      expect(formatUnits(1n, PRICE_DECIMALS)).toBe("0.00000001");
      expect(formatUnits("9876543210000000", PRICE_DECIMALS)).toBe("98765432.1");
    });

    it("should keep one fraction digit for whole values", () => {
      expect(formatUnits(100000000n, PRICE_DECIMALS)).toBe("1.0");
      expect(formatUnits(0n, PRICE_DECIMALS)).toBe("0.0");
      expect(formatUnits(-100000000n, PRICE_DECIMALS)).toBe("-1.0");
    });

    it("should round trip an 18 decimal value", () => {
      const value = "1.000000000000000001";

      expect(formatUnits(parseUnits(value, ETHER_DECIMALS), ETHER_DECIMALS)).toBe(value);
    });
  });

  describe("parseEther and formatEther", () => {
    it("should use 18 decimals", () => {
      expect(parseEther("1").toString()).toBe("1000000000000000000");
      expect(parseEther("0.1").toString()).toBe("100000000000000000");
      expect(formatEther(BigNumber.from("1000000000000000000"))).toBe("1.0");
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
});

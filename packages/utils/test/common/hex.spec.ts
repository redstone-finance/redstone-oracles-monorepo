import { arrayify, hexlify, hexValue, hexZeroPad, isHexString } from "../../src/common/hex";

const BYTES = [0x0a, 0xff, 0x00, 0x7b];
const HEX = "0x0aff007b";
const HEX_VARIANTS = [HEX, "0X0AFF007B", "0aff007b", "0AFF007B"];
const HEX_ODD_LENGTH = "0xaff007b";
const NOT_HEX = ["", "0x", "0xzz", "suiprivkey1qtest"];
const WORD_BYTE_LENGTH = 32;
const PADDED_WORD = `0x${"0".repeat(56)}0aff007b`;

describe("utils/hex", () => {
  describe("isHexString", () => {
    it.each(HEX_VARIANTS)("should accept %s", (value) => {
      expect(isHexString(value)).toBe(true);
    });

    it.each([...NOT_HEX, HEX_ODD_LENGTH])("should reject %s", (value) => {
      expect(isHexString(value)).toBe(false);
    });
  });

  describe("arrayify", () => {
    it.each(HEX_VARIANTS)("should convert %s to bytes", (value) => {
      expect(arrayify(value)).toEqual(Uint8Array.from(BYTES));
    });

    it.each([BYTES, Uint8Array.from(BYTES), Buffer.from(BYTES)])(
      "should convert %p to bytes",
      (value) => {
        expect(arrayify(value)).toEqual(Uint8Array.from(BYTES));
      }
    );

    it.each(NOT_HEX)("should throw for %s instead of truncating it", (value) => {
      expect(() => arrayify(value)).toThrow(`Not a hex string: ${value}`);
    });

    it("should tell odd-length hex apart from a non-hex string", () => {
      expect(() => arrayify(HEX_ODD_LENGTH)).toThrow(`hex data is odd-length: ${HEX_ODD_LENGTH}`);
    });
  });

  describe("hexlify", () => {
    it.each([BYTES, Uint8Array.from(BYTES), Buffer.from(BYTES), ...HEX_VARIANTS])(
      "should convert %p to a prefixed lowercase hex string",
      (value) => {
        expect(hexlify(value)).toBe(HEX);
      }
    );

    it("should throw for odd-length hex", () => {
      expect(() => hexlify(HEX_ODD_LENGTH)).toThrow("hex data is odd-length");
    });
  });

  describe("hexValue", () => {
    it.each([
      [0, "0x0"],
      [1, "0x1"],
      [255, "0xff"],
      [256n, "0x100"],
    ] as const)("should write %p as the shortest quantity %s", (value, expected) => {
      expect(hexValue(value)).toBe(expected);
    });

    it.each([
      [HEX, "0xaff007b"],
      ["0X0AFF007B", "0xaff007b"],
      [HEX_ODD_LENGTH, "0xaff007b"],
      ["0x00", "0x0"],
      ["0x0000", "0x0"],
    ])("should strip the leading zeros of %s", (value, expected) => {
      expect(hexValue(value)).toBe(expected);
    });

    it("should read a byte array as a quantity", () => {
      expect(hexValue(BYTES)).toBe("0xaff007b");
    });

    it.each(NOT_HEX)("should throw for %s", (value) => {
      expect(() => hexValue(value)).toThrow(`Not a hex string: ${value}`);
    });
  });

  describe("hexZeroPad", () => {
    it.each([HEX, HEX_ODD_LENGTH, "0X0AFF007B"])(
      "should pad %s to the left up to the asked width",
      (value) => {
        expect(hexZeroPad(value, WORD_BYTE_LENGTH)).toBe(PADDED_WORD);
      }
    );

    it("should pad a byte array the same way", () => {
      expect(hexZeroPad(BYTES, WORD_BYTE_LENGTH)).toBe(PADDED_WORD);
    });

    it("should leave a value that already fills the width untouched", () => {
      expect(hexZeroPad(PADDED_WORD, WORD_BYTE_LENGTH)).toBe(PADDED_WORD);
    });

    it("should throw for a value wider than the asked width", () => {
      expect(() => hexZeroPad(HEX, 2)).toThrow("does not fit in 2 bytes");
    });
  });
});

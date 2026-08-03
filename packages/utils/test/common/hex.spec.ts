import { arrayify, hexlify, isHexString } from "../../src/common/hex";

const BYTES = [0x0a, 0xff, 0x00, 0x7b];
const HEX = "0x0aff007b";
const HEX_VARIANTS = [HEX, "0X0AFF007B", "0aff007b", "0AFF007B"];
const HEX_ODD_LENGTH = "0xaff007b";
const NOT_HEX = ["", "0x", "0xzz", "suiprivkey1qtest"];

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
});

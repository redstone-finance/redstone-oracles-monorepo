import {
  formatBytes32String,
  parseBytes32String,
  toUtf8Bytes,
  toUtf8String,
} from "../../src/common/utf8";

const TEXT = "ETH";
const TEXT_BYTES = [0x45, 0x54, 0x48];
const TEXT_HEX = "0x455448";
const BYTES32_HEX = `${TEXT_HEX}${"00".repeat(29)}`;

describe("utils/utf8", () => {
  describe("toUtf8Bytes", () => {
    it("should convert ascii text to bytes", () => {
      expect(toUtf8Bytes(TEXT)).toEqual(Uint8Array.from(TEXT_BYTES));
    });

    it("should convert multi-byte characters", () => {
      expect(toUtf8Bytes("żółw")).toEqual(Uint8Array.from(Buffer.from("żółw", "utf8")));
    });

    it("should convert an empty string to empty bytes", () => {
      expect(toUtf8Bytes("")).toEqual(new Uint8Array());
    });
  });

  describe("toUtf8String", () => {
    it.each([TEXT_HEX, TEXT_BYTES, Uint8Array.from(TEXT_BYTES), Buffer.from(TEXT_BYTES)])(
      "should convert %p back to text",
      (value) => {
        expect(toUtf8String(value)).toBe(TEXT);
      }
    );

    it("should keep trailing nulls", () => {
      expect(toUtf8String(BYTES32_HEX)).toBe(`${TEXT}${"\0".repeat(29)}`);
    });
  });

  describe("formatBytes32String", () => {
    it("should pad the text to 32 bytes", () => {
      expect(formatBytes32String(TEXT)).toBe(BYTES32_HEX);
    });

    it("should round-trip with parseBytes32String", () => {
      expect(parseBytes32String(formatBytes32String("BTC"))).toBe("BTC");
    });

    it("should throw when the text does not leave room for the null terminator", () => {
      expect(() => formatBytes32String("E".repeat(32))).toThrow("must be less than 32 bytes");
    });
  });

  describe("parseBytes32String", () => {
    it("should drop the zero padding", () => {
      expect(parseBytes32String(BYTES32_HEX)).toBe(TEXT);
    });

    it("should throw when the value is not 32 bytes long", () => {
      expect(() => parseBytes32String(TEXT_HEX)).toThrow("not 32 bytes long");
    });

    it("should throw when the value has no null terminator", () => {
      expect(() => parseBytes32String(`0x${"41".repeat(32)}`)).toThrow("no null terminator");
    });

    it("should throw on invalid utf-8", () => {
      expect(() => parseBytes32String(`0xff${"00".repeat(31)}`)).toThrow();
    });
  });
});

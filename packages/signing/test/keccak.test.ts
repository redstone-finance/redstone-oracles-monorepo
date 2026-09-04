import { hexlify } from "@ethersproject/bytes";
import { keccak256 } from "../src";

const TEXT_BYTES = [0x61, 0x62, 0x63];
const TEXT_HEX = "0x616263";
const LONG_PAYLOAD_LENGTH = 4750;
const BYTE_VALUES = 256;
const KECCAK256_OF_ABC = "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45";
const KECCAK256_OF_EMPTY = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

describe("keccak256", () => {
  test.each([TEXT_HEX, Uint8Array.from(TEXT_BYTES), Buffer.from(TEXT_BYTES)])(
    "Should hash %p to the keccak256 of 'abc'",
    (data) => {
      expect(hexlify(keccak256(data))).toBe(KECCAK256_OF_ABC);
    }
  );

  test("Should hash empty bytes", () => {
    expect(hexlify(keccak256(new Uint8Array()))).toBe(KECCAK256_OF_EMPTY);
  });

  test("Should accept a hex string without the prefix", () => {
    expect(hexlify(keccak256("616263"))).toBe(KECCAK256_OF_ABC);
  });

  test("Should hash a payload longer than one block", () => {
    const bytes = Uint8Array.from(
      { length: LONG_PAYLOAD_LENGTH },
      (_, index) => index % BYTE_VALUES
    );

    expect(hexlify(keccak256(bytes))).toBe(hexlify(keccak256(hexlify(bytes))));
  });
});

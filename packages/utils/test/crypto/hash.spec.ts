import { sha256ToHex } from "../../src/crypto/hash";

const TEXT_BYTES = [0x61, 0x62, 0x63];
const TEXT_HEX = "0x616263";
const SHA256_OF_ABC = "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const SHA256_OF_EMPTY = "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("utils/crypto/hash", () => {
  describe("sha256ToHex", () => {
    it.each([TEXT_HEX, TEXT_BYTES, Uint8Array.from(TEXT_BYTES), Buffer.from(TEXT_BYTES)])(
      "should hash %p to the sha256 of 'abc'",
      (data) => {
        expect(sha256ToHex(data)).toBe(SHA256_OF_ABC);
      }
    );

    it("should hash empty bytes", () => {
      expect(sha256ToHex([])).toBe(SHA256_OF_EMPTY);
    });
  });
});

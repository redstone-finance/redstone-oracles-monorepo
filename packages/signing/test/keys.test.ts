import { addressFromPrivateKey, generateKeypair, publicKeyFromPrivateKey } from "../src";

const PRIVATE_KEY_FOR_TESTS = "0x1111111111111111111111111111111111111111111111111111111111111111";
const EXPECTED_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A";

describe("keys", () => {
  test("Should derive the address from a private key", () => {
    expect(addressFromPrivateKey(PRIVATE_KEY_FOR_TESTS)).toBe(EXPECTED_ADDRESS);
  });

  test("Should derive an uncompressed public key from a private key", () => {
    const publicKey = publicKeyFromPrivateKey(PRIVATE_KEY_FOR_TESTS);

    expect(publicKey).toMatch(/^0x04[0-9a-f]{128}$/);
  });

  test("Should generate a self-consistent key pair", () => {
    const { privateKey, publicKey, address } = generateKeypair();

    expect(publicKeyFromPrivateKey(privateKey)).toBe(publicKey);
    expect(addressFromPrivateKey(privateKey)).toBe(address);
  });

  test("Should generate a different key pair each time", () => {
    expect(generateKeypair().privateKey).not.toBe(generateKeypair().privateKey);
  });
});

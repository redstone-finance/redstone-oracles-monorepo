import { arrayify } from "@ethersproject/bytes";
import { addressFromPrivateKey, hashTypedData, signTypedData, UniversalSigner } from "../src";

const PRIVATE_KEY_FOR_TESTS = "0x1111111111111111111111111111111111111111111111111111111111111111";

const DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000",
};

const TYPES = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" },
  ],
};

const VALUE = {
  source: "a",
  connectionId: "0x230a650f45bd2fb93390f0e372a77022536e6d9da6408aa3f1b2f28e04fb2011",
};

describe("typed-data", () => {
  test("Should hash typed data deterministically", () => {
    const hash = hashTypedData(DOMAIN, TYPES, VALUE);

    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashTypedData(DOMAIN, TYPES, VALUE)).toBe(hash);
  });

  test("Should produce a different hash for different values", () => {
    expect(hashTypedData(DOMAIN, TYPES, { ...VALUE, source: "b" })).not.toBe(
      hashTypedData(DOMAIN, TYPES, VALUE)
    );
  });

  test("Should sign typed data recoverable to the signer address", async () => {
    const signature = await signTypedData(DOMAIN, TYPES, VALUE, PRIVATE_KEY_FOR_TESTS);
    const digest = arrayify(hashTypedData(DOMAIN, TYPES, VALUE));

    expect(UniversalSigner.recoverAddress(digest, signature)).toBe(
      addressFromPrivateKey(PRIVATE_KEY_FOR_TESTS)
    );
  });
});

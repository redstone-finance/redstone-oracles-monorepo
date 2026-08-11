import { arrayify } from "@ethersproject/bytes";
import { parse } from "@ethersproject/transactions";
import { Wallet as EthersWallet } from "@ethersproject/wallet";
import {
  addressFromPrivateKey,
  createWallet,
  hashTypedData,
  signTransaction,
  UniversalSigner,
} from "../src";

const PRIVATE_KEY_FOR_TESTS = "0x1111111111111111111111111111111111111111111111111111111111111111";
const DIGEST = "0x230a650f45bd2fb93390f0e372a77022536e6d9da6408aa3f1b2f28e04fb2011";

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
const VALUE = { source: "a", connectionId: DIGEST };

const TRANSACTION = {
  to: "0x2222222222222222222222222222222222222222",
  data: "0xabcdef",
  chainId: 1,
  nonce: 7,
  gasLimit: 21_000,
  maxFeePerGas: 1_000_000_000,
  maxPriorityFeePerGas: 100_000_000,
  type: 2,
};

describe("Wallet", () => {
  const wallet = createWallet(PRIVATE_KEY_FOR_TESTS);

  test("Should expose the derived address synchronously and asynchronously", async () => {
    expect(wallet.address).toBe(addressFromPrivateKey(PRIVATE_KEY_FOR_TESTS));
    await expect(wallet.getAddress()).resolves.toBe(wallet.address);
  });

  test("Should sign a digest recoverable to its address", () => {
    const signature = wallet.signDigest(DIGEST);

    expect(UniversalSigner.recoverAddress(arrayify(DIGEST), signature)).toBe(wallet.address);
  });

  test("Should sign utf8 text exactly as ethers Wallet.signMessage does", async () => {
    const text = "1654353400000";

    await expect(new EthersWallet(PRIVATE_KEY_FOR_TESTS).signMessage(text)).resolves.toBe(
      wallet.signMessage(text)
    );
  });

  test("Should recover the signer of a text message", () => {
    const text = "test-message";
    const signature = wallet.signMessage(text);

    expect(UniversalSigner.recoverAddressFromEthereumHashMessage(text, signature)).toBe(
      wallet.address
    );
  });

  test("Should sign typed data recoverable to its address", async () => {
    const signature = await wallet.signTypedData(DOMAIN, TYPES, VALUE);

    expect(
      UniversalSigner.recoverAddress(arrayify(hashTypedData(DOMAIN, TYPES, VALUE)), signature)
    ).toBe(wallet.address);
  });

  test("Should sign a transaction identically to the standalone helper", async () => {
    const serialized = await wallet.signTransaction(TRANSACTION);

    expect(serialized).toBe(await signTransaction(TRANSACTION, PRIVATE_KEY_FOR_TESTS));
    expect(parse(serialized).from).toBe(wallet.address);
  });

  test("Should be immutable", () => {
    expect(Object.isFrozen(wallet)).toBe(true);
  });
});

describe("createWallet private key normalization", () => {
  const BARE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  test("Should accept a bare hex key, deriving the same address as ethers Wallet", () => {
    expect(createWallet(BARE_KEY).address).toBe(new EthersWallet(BARE_KEY).address);
  });

  test("Should sign digests with a bare hex key", () => {
    const wallet = createWallet(BARE_KEY);
    const signature = wallet.signDigest(DIGEST);

    expect(UniversalSigner.recoverAddress(arrayify(DIGEST), signature)).toBe(wallet.address);
  });

  test("Should sign messages with a bare hex key, matching ethers", async () => {
    const wallet = createWallet(BARE_KEY);

    await expect(new EthersWallet(BARE_KEY).signMessage("test-message")).resolves.toBe(
      wallet.signMessage("test-message")
    );
  });

  test("Should treat prefixed and bare forms of the same key as one wallet", () => {
    expect(createWallet(BARE_KEY).address).toBe(createWallet(`0x${BARE_KEY}`).address);
  });
});

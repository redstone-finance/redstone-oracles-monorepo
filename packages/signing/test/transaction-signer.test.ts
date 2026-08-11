import { parse } from "@ethersproject/transactions";
import { addressFromPrivateKey, signTransaction } from "../src";

const PRIVATE_KEY_FOR_TESTS = "0x1111111111111111111111111111111111111111111111111111111111111111";

describe("signTransaction", () => {
  const transaction = {
    to: "0x2222222222222222222222222222222222222222",
    data: "0xabcdef",
    chainId: 1,
    nonce: 7,
    gasLimit: 21_000,
    maxFeePerGas: 1_000_000_000,
    maxPriorityFeePerGas: 100_000_000,
    type: 2,
  };

  test("Should sign a transaction recoverable to the private key address", async () => {
    const serialized = await signTransaction(transaction, PRIVATE_KEY_FOR_TESTS);
    const parsed = parse(serialized);

    expect(parsed.from).toBe(addressFromPrivateKey(PRIVATE_KEY_FOR_TESTS));
    expect(parsed.to).toBe(transaction.to);
    expect(parsed.nonce).toBe(transaction.nonce);
    expect(parsed.chainId).toBe(transaction.chainId);
  });
});

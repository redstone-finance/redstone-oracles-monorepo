import { Interface as InterfaceV5 } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { RedstoneCommon, RedstoneCrypto } from "@redstone-finance/utils";
import { expect } from "chai";
import { encodeCalldata } from "../src/evm-contract/abi";

const SHARES_AMOUNT = (1e18).toString();
const SELECTOR_HEX_LENGTH = "0x".length + 4 * 2;
const POOL_KEY = {
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: "0x76A495b0bFfb53ef3F0E94ef0763e03cE410835C",
  fee: 3000,
  tickSpacing: 60,
  hooks: "0x0000000000000000000000000000000000000000",
};

const encodeWithInterfaceV5 = (signature: string, name: string, args: unknown[]) =>
  new InterfaceV5([`function ${signature}`]).encodeFunctionData(name, args);

const functionSelector = (signature: string) =>
  RedstoneCrypto.keccak256ToHex(RedstoneCommon.toUtf8Bytes(signature)).slice(
    0,
    SELECTOR_HEX_LENGTH
  );

describe("encodeCalldata", () => {
  it("matches the v5 Interface for a function taking an argument", () => {
    const signature = "convertSnBnbToBnb(uint256 amount)";

    expect(encodeCalldata(signature, [SHARES_AMOUNT])).to.equal(
      encodeWithInterfaceV5(signature, "convertSnBnbToBnb", [SHARES_AMOUNT])
    );
  });

  it("matches the v5 Interface for many argument types", () => {
    const signature = "poolInfo(address token, uint24 fee, bool flag)";
    const args = ["0x76A495b0bFfb53ef3F0E94ef0763e03cE410835C", 3000, true];

    expect(encodeCalldata(signature, args)).to.equal(
      encodeWithInterfaceV5(signature, "poolInfo", args)
    );
  });

  it("matches the plain function selector when there are no arguments", () => {
    for (const signature of ["exchangeRate()", "getRate()", "pricePerShare()"]) {
      expect(encodeCalldata(signature)).to.equal(functionSelector(signature));
    }
  });

  it("accepts a v5 BigNumber argument", () => {
    const signature = "convertToTokens(uint256 amount)";

    expect(encodeCalldata(signature, [BigNumber.from(SHARES_AMOUNT)])).to.equal(
      encodeWithInterfaceV5(signature, "convertToTokens", [SHARES_AMOUNT])
    );
  });

  it("encodes a named tuple passed as an object", () => {
    const signature =
      "getSlot0((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key)";

    expect(encodeCalldata(signature, [POOL_KEY])).to.equal(
      encodeWithInterfaceV5(signature, "getSlot0", [POOL_KEY])
    );
  });

  it("encodes a tuple passed positionally and an array of tuples", () => {
    const tupleSignature = "getSlot0((address, address, uint24, int24, address))";
    const positional = Object.values(POOL_KEY);

    expect(encodeCalldata(tupleSignature, [positional])).to.equal(
      encodeWithInterfaceV5(tupleSignature, "getSlot0", [positional])
    );

    const arraySignature = "quoteMany((address token, uint256 amount)[] quotes)";
    const quotes = [
      { token: "0x76A495b0bFfb53ef3F0E94ef0763e03cE410835C", amount: SHARES_AMOUNT },
      { token: "0x0000000000000000000000000000000000000000", amount: "1" },
    ];

    expect(encodeCalldata(arraySignature, [quotes])).to.equal(
      encodeWithInterfaceV5(arraySignature, "quoteMany", [quotes])
    );
  });

  it("ignores the return types, keyword and mutability in the signature", () => {
    const bare = encodeCalldata("previewMint(uint256 shares)", [SHARES_AMOUNT]);

    for (const signature of [
      "function previewMint(uint256 shares)",
      "previewMint(uint256 shares) view returns (uint256)",
      "function previewMint(uint256 shares) view returns (uint256 assets)",
    ]) {
      expect(encodeCalldata(signature, [SHARES_AMOUNT])).to.equal(bare);
    }
  });
});

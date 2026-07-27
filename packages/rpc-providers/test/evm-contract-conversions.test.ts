import { defaultAbiCoder } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { Interface } from "ethers-v6";
import { toV5BigNumber, toV6Arg } from "../src/evm-contract-conversions";

const AMOUNT_X = "123456789012345678901234567890";
const AMOUNT_Y = "987654321098765432109876543210";

describe("toV5BigNumber", () => {
  it("converts a bigint to a v5 BigNumber", () => {
    const result = toV5BigNumber(BigInt(AMOUNT_X));

    expect(BigNumber.isBigNumber(result)).to.equal(true);
    expect((result as BigNumber).toString()).to.equal(AMOUNT_X);
  });

  it("converts bigints nested in arrays and objects", () => {
    const result = toV5BigNumber({ amounts: [BigInt(AMOUNT_X), BigInt(AMOUNT_Y)], label: "x" }) as {
      amounts: BigNumber[];
      label: string;
    };

    expect(result.amounts.map((amount) => amount.toString())).to.deep.equal([AMOUNT_X, AMOUNT_Y]);
    expect(result.label).to.equal("x");
  });

  it("keeps positional and named fields of a v6 Result", () => {
    const encoded = defaultAbiCoder.encode(["uint256", "uint256"], [AMOUNT_X, AMOUNT_Y]);
    const decoded = new Interface([
      "function f() view returns (uint256 amountX, uint256 amountY)",
    ]).decodeFunctionResult("f", encoded);

    const result = toV5BigNumber(decoded) as BigNumber[] & {
      amountX: BigNumber;
      amountY: BigNumber;
    };

    expect(result[0].toString()).to.equal(AMOUNT_X);
    expect(result.amountX.toString()).to.equal(AMOUNT_X);
    expect(result.amountY.toString()).to.equal(AMOUNT_Y);
  });

  it("passes a Uint8Array (bytes) through unchanged, not mapped to a plain object", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const result = toV5BigNumber(bytes);

    expect(result).to.equal(bytes);
    expect(result).to.be.instanceOf(Uint8Array);
  });
});

describe("toV6Arg", () => {
  it("converts a v5 BigNumber to a bigint", () => {
    expect(toV6Arg(BigNumber.from(AMOUNT_X))).to.equal(BigInt(AMOUNT_X));
  });

  it("converts BigNumbers nested in structs and arrays", () => {
    const result = toV6Arg({
      amountIn: BigNumber.from(AMOUNT_X),
      amounts: [BigNumber.from(AMOUNT_X), BigNumber.from(AMOUNT_Y)],
      tokenIn: "0xabc",
    }) as { amountIn: bigint; amounts: bigint[]; tokenIn: string };

    expect(result.amountIn).to.equal(BigInt(AMOUNT_X));
    expect(result.amounts).to.deep.equal([BigInt(AMOUNT_X), BigInt(AMOUNT_Y)]);
    expect(result.tokenIn).to.equal("0xabc");
  });

  it("passes through values ethers v6 already accepts", () => {
    expect(toV6Arg("0xabc")).to.equal("0xabc");
    expect(toV6Arg(7)).to.equal(7);
    expect(toV6Arg(true)).to.equal(true);
  });

  it("passes a Uint8Array (bytes) through unchanged, not mapped to a plain object", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const result = toV6Arg(bytes);

    expect(result).to.equal(bytes);
    expect(result).to.be.instanceOf(Uint8Array);
  });
});

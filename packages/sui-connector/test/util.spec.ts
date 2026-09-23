import { bcs } from "@mysten/sui/bcs";
import { RedstoneCommon } from "@redstone-finance/utils";
import { hexToBytes, makeFeedIdBytes, serializeSigners, suiToMist } from "../src";

const SIGNER = "0x8BB8F32Df04c8b654987DAaeD53D6B6091e3B774";
const SIGNER_BYTES = [
  139, 184, 243, 45, 240, 76, 139, 101, 73, 135, 218, 174, 213, 61, 107, 96, 145, 227, 183, 116,
];
const FEED_ID_BYTE_LENGTH = 32;

describe("hexToBytes", () => {
  it("should give every byte of the address", () => {
    expect(Array.from(hexToBytes(SIGNER))).toEqual(SIGNER_BYTES);
  });

  it("should throw for an odd-length hex string", () => {
    expect(() => hexToBytes("0x8BB")).toThrow();
  });

  it("should throw for a non-hex string", () => {
    expect(() => hexToBytes("0xzz")).toThrow();
  });
});

describe("suiToMist", () => {
  it("should convert a fractional amount without a floating point remainder", () => {
    expect(suiToMist(33.333333)).toEqual(33333333000n);
    expect(suiToMist(0.123456)).toEqual(123456000n);
    expect(suiToMist(0.3)).toEqual(300000000n);
  });

  it("should floor sub-mist fractions", () => {
    expect(suiToMist(0.0000000015)).toEqual(1n);
  });
});

describe("makeFeedIdBytes", () => {
  it("should pad a feed id to the contract length", () => {
    const bytes = makeFeedIdBytes("BTC");

    expect(bytes.length).toEqual(FEED_ID_BYTE_LENGTH);
    expect(Buffer.from(bytes).toString().replace(/\0+$/, "")).toEqual("BTC");
  });

  it("should throw for a feed id longer than the contract length", () => {
    expect(() => makeFeedIdBytes("F".repeat(FEED_ID_BYTE_LENGTH + 1))).toThrow();
  });
});

describe("serializeSigners", () => {
  it("should serialize a signer as its raw bytes", () => {
    const parsed = bcs.vector(bcs.vector(bcs.u8())).parse(serializeSigners([SIGNER]).toBytes());

    expect(parsed).toEqual([Array.from(RedstoneCommon.arrayify(SIGNER))]);
  });
});

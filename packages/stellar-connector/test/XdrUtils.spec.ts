import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import * as XdrUtils from "../src/XdrUtils";

function getPricesToScVal(prices: bigint[], timestamp: number) {
  return [nativeToScVal(timestamp), XdrUtils.mapArrayToScVec(prices, nativeToScVal)];
}

describe("XdrUtils tests", () => {
  it("parseGetPrices correct input", () => {
    const output = XdrUtils.parseGetPrices(getPricesToScVal([1n, 2n], 10));

    expect(output).toStrictEqual({ timestamp: 10, prices: [1n, 2n] });
  });

  it("parseGetPrices bad input", () => {
    expect(() => XdrUtils.parseGetPrices([nativeToScVal(10), nativeToScVal(10)])).toThrow();
  });

  it("parsePriceAndTimestamp correct input", () => {
    const output = XdrUtils.parsePriceAndTimestamp([nativeToScVal(10n), nativeToScVal(10)]);

    expect(output).toStrictEqual({ value: 10n, timestamp: 10 });
  });

  it("parsePriceAndTimestamp bad input 1", () => {
    expect(() => XdrUtils.parsePriceAndTimestamp(getPricesToScVal([1n, 2n], 10))).toThrow();
  });

  it("parsePriceAndTimestamp bad input 2", () => {
    expect(() =>
      XdrUtils.parsePriceAndTimestamp([
        XdrUtils.addressToScVal("asdsd"),
        XdrUtils.addressToScVal("asdsd"),
      ])
    ).toThrow();
  });

  it("findVal in array", () => {
    const map = [
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("price"),
        val: nativeToScVal(1),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("b"),
        val: nativeToScVal(2),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("c"),
        val: nativeToScVal(3),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("d"),
        val: nativeToScVal(4),
      }),
    ];
    const output = XdrUtils.findVal(map, xdr.ScVal.scvSymbol("price"));

    expect(Number(scValToNative(output!.val()))).toBe(1);
  });

  it("findVal not in array", () => {
    const map = [
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("b"),
        val: nativeToScVal(2),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("c"),
        val: nativeToScVal(3),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("d"),
        val: nativeToScVal(4),
      }),
    ];

    const output = XdrUtils.findVal(map, xdr.ScVal.scvSymbol("price"));

    expect(output).toBeUndefined();
  });

  it("lastRoundDetailsFromXdrMap correct input", () => {
    const map = [
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("price"),
        val: nativeToScVal(2),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("package_timestamp"),
        val: nativeToScVal(3),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("write_timestamp"),
        val: nativeToScVal(4),
      }),
    ];

    const lastRoundDetails = XdrUtils.lastRoundDetailsFromXdrMap(map);

    expect(lastRoundDetails).toStrictEqual({
      lastValue: 2n,
      lastDataPackageTimestampMS: 3,
      lastBlockTimestampMS: 4,
    });
  });

  it("lastRoundDetailsFromXdrMap bad input 2", () => {
    const map = [
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("price"),
        val: nativeToScVal(2),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("package_timestamp"),
        val: nativeToScVal(3),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("xxx"),
        val: nativeToScVal(4),
      }),
    ];

    expect(() => XdrUtils.lastRoundDetailsFromXdrMap(map)).toThrow();
  });
});

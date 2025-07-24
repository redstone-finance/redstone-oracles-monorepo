import { MoveVector } from "@aptos-labs/ts-sdk";
import { feedIdHexToMoveVector, makeFeedIdBytes } from "../src";

const ETH_FEED = "ETH";
const ETH_BUFFER = new Uint8Array([
  69, 84, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
]);
const BTC_FEED = "BTC";
const BTC_BUFFER = new Uint8Array([
  66, 84, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
]);
const SOL_FEED = "SOL";
const SOL_BUFFER = new Uint8Array([
  83, 79, 76, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
]);
const ETH_HEX =
  "4554480000000000000000000000000000000000000000000000000000000000";
const BTC_HEX =
  "4254430000000000000000000000000000000000000000000000000000000000";
const SOL_HEX =
  "534f4c0000000000000000000000000000000000000000000000000000000000";

describe.only("utils", () => {
  it("should serialize make feed bytes", () => {
    const testCases = [
      {
        feed: ETH_FEED,
        buffer: ETH_BUFFER,
      },
      {
        feed: BTC_FEED,
        buffer: BTC_BUFFER,
      },
      {
        feed: SOL_FEED,
        buffer: SOL_BUFFER,
      },
    ];
    testCases.forEach((c) => {
      const result = makeFeedIdBytes(c.feed);
      expect(result).toStrictEqual(c.buffer);
    });
  });

  it("should serialize hex value without prefix to MoveVector", () => {
    const testCases = [
      {
        hex: ETH_HEX,
        moveVector: MoveVector.U8(new Uint8Array(ETH_BUFFER)),
      },
      {
        hex: BTC_HEX,
        moveVector: MoveVector.U8(new Uint8Array(BTC_BUFFER)),
      },
      {
        hex: SOL_HEX,
        moveVector: MoveVector.U8(new Uint8Array(SOL_BUFFER)),
      },
    ];
    testCases.forEach((c) => {
      const result = feedIdHexToMoveVector(c.hex);
      expect(result).toStrictEqual(c.moveVector);
    });
  });

  it("should serialize hex value with prefix to MoveVector", () => {
    const testCases = [
      {
        hex: `0x${ETH_HEX}`,
        moveVector: MoveVector.U8(new Uint8Array(ETH_BUFFER)),
      },
      {
        hex: `0x${BTC_HEX}`,
        moveVector: MoveVector.U8(new Uint8Array(BTC_BUFFER)),
      },
      {
        hex: `0x${SOL_HEX}`,
        moveVector: MoveVector.U8(new Uint8Array(SOL_BUFFER)),
      },
    ];
    testCases.forEach((c) => {
      const result = feedIdHexToMoveVector(c.hex);
      expect(result).toStrictEqual(c.moveVector);
    });
  });
});

import { defaultAbiCoder } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { callAtBlock } from "../src/common";
import { encodeCalldata } from "../src/evm-contract";
import { deployCounter, realV5Provider, realV6Provider } from "./helpers";

const START_COUNT = 5;
const BUMP = 7;
const GET_COUNT_SIGNATURE = "getCount()";

describe("callAtBlock", () => {
  let address: string;
  let blockOfStartCount: number;

  beforeEach(async () => {
    const counter = await deployCounter(realV5Provider());
    await (await counter.incBy(START_COUNT)).wait();
    address = counter.address;
    blockOfStartCount = await realV5Provider().getBlockNumber();
    await (await counter.incBy(BUMP)).wait();
  });

  it("returns the same string from a v5 and a v6 provider", async () => {
    const tx = { to: address, data: encodeCalldata(GET_COUNT_SIGNATURE) };

    const fromV5 = await callAtBlock(realV5Provider(), tx);
    const fromV6 = await callAtBlock(realV6Provider(), tx);

    expect(fromV5).to.equal(fromV6);
    expect(fromV5).to.be.a("string");
  });

  it("honours the blockTag on both versions instead of silently reading latest", async () => {
    const tx = { to: address, data: encodeCalldata(GET_COUNT_SIGNATURE) };

    const [pastFromV5, pastFromV6, latestFromV5, latestFromV6] = await Promise.all([
      callAtBlock(realV5Provider(), tx, blockOfStartCount),
      callAtBlock(realV6Provider(), tx, blockOfStartCount),
      callAtBlock(realV5Provider(), tx),
      callAtBlock(realV6Provider(), tx),
    ]);

    expect(pastFromV5).to.equal(pastFromV6);
    expect(latestFromV5).to.equal(latestFromV6);
    expect(pastFromV5).to.not.equal(latestFromV5);
  });

  it("decodes to the same value however the result is parsed", async () => {
    const tx = { to: address, data: encodeCalldata(GET_COUNT_SIGNATURE) };
    const expectedAtBlock = String(START_COUNT);
    const expectedLatest = String(START_COUNT + BUMP);

    for (const provider of [realV5Provider(), realV6Provider()]) {
      const past = await callAtBlock(provider, tx, blockOfStartCount);
      const latest = await callAtBlock(provider, tx);

      expect(BigNumber.from(past).toString()).to.equal(expectedAtBlock);
      expect((defaultAbiCoder.decode(["uint256"], past) as BigNumber[])[0].toString()).to.equal(
        expectedAtBlock
      );

      expect(BigNumber.from(latest).toString()).to.equal(expectedLatest);
    }
  });
});

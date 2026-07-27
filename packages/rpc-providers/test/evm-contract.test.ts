import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { evmContract, evmContractV5, evmContractV6 } from "../src/evm-contract";
import { deployCounter, realV5Provider, realV6Provider } from "./helpers";

const COUNTER_ABI = [
  "function getCount() view returns (uint256)",
  "function getCounts() view returns (uint256 current, uint256 next)",
];
const START_COUNT = 5;

interface CounterView {
  callStatic: {
    getCount: () => Promise<BigNumber>;
    getCounts: () => Promise<{ current: BigNumber; next: BigNumber }>;
  };
}

const CONTRACTS: Record<string, (address: string) => CounterView> = {
  "v5 adapter over a real ethers-v5 provider": (address) =>
    evmContractV5<CounterView>(address, COUNTER_ABI, realV5Provider()),
  "v6 adapter over a real ethers-v5 provider": (address) =>
    evmContractV6<CounterView>(address, COUNTER_ABI, realV5Provider()),
  "evmContract over a real ethers-v6 provider (isV6Provider branch)": (address) =>
    evmContract<CounterView>(address, COUNTER_ABI, realV6Provider()),
};

for (const [name, build] of Object.entries(CONTRACTS)) {
  describe(`evmContract — ${name}`, () => {
    let contract: CounterView;

    beforeEach(async () => {
      const counter = await deployCounter(realV5Provider());
      await (await counter.incBy(START_COUNT)).wait();
      contract = build(counter.address);
    });

    it("decodes a uint read to a v5 BigNumber", async () => {
      const count = await contract.callStatic.getCount();

      expect(BigNumber.isBigNumber(count)).to.equal(true);
      expect(count.toString()).to.equal(String(START_COUNT));
    });

    it("exposes named struct fields as v5 BigNumber (MerlinSwap/Pendle shape)", async () => {
      const { current, next } = await contract.callStatic.getCounts();

      expect([current, next].every(BigNumber.isBigNumber)).to.equal(true);
      expect(current.toString()).to.equal(String(START_COUNT));
      expect(next.toString()).to.equal(String(START_COUNT + 1));
    });
  });
}

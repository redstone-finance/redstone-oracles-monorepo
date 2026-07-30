import { Interface } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { evmWritableContract } from "../src";
import { deployCounter, realV5Provider, realV6Provider } from "./helpers";

const COUNTER_ABI = ["function incBy(uint256 by)", "function fund() payable"];
const INC_BY = 7;
const FUND_VALUE = BigNumber.from(1234);

interface CounterWritable {
  callStatic: object;
  populateTransaction: {
    incBy: (by: number) => Promise<{ to?: string; data: string }>;
    fund: (overrides: {
      value: BigNumber;
    }) => Promise<{ to?: string; data: string; value?: BigNumber }>;
  };
}

const WRITABLE_CONTRACTS: Record<string, (address: string) => CounterWritable> = {
  "v5 path": (address) =>
    evmWritableContract<CounterWritable>(address, COUNTER_ABI, realV5Provider(), false),
  "v6 path over a real ethers-v5 provider": (address) =>
    evmWritableContract<CounterWritable>(address, COUNTER_ABI, realV5Provider(), true),
  "v6 path over a real ethers-v6 provider": (address) =>
    evmWritableContract<CounterWritable>(address, COUNTER_ABI, realV6Provider()),
};

for (const [name, build] of Object.entries(WRITABLE_CONTRACTS)) {
  describe(`evmWritableContract — ${name}`, () => {
    let contract: CounterWritable;
    let address: string;

    beforeEach(async () => {
      const counter = await deployCounter(realV5Provider());
      address = counter.address;
      contract = build(address);
    });

    it("builds calldata for a write and targets the contract", async () => {
      const tx = await contract.populateTransaction.incBy(INC_BY);
      const expectedData = new Interface(COUNTER_ABI).encodeFunctionData("incBy", [INC_BY]);

      expect(tx.to?.toLowerCase()).to.equal(address.toLowerCase());
      expect(tx.data).to.equal(expectedData);
    });

    it("preserves the value override for a payable write", async () => {
      const tx = await contract.populateTransaction.fund({ value: FUND_VALUE });

      expect(tx.to?.toLowerCase()).to.equal(address.toLowerCase());
      expect(tx.value?.toString()).to.equal(FUND_VALUE.toString());
    });
  });
}

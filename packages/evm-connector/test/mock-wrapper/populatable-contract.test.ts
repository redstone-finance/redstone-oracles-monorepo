import { consts } from "@redstone-finance/protocol";
import { expect } from "chai";
import { MockWrapper, type PopulatableContract } from "../../src";
import { mockNumericPackages } from "../tests-common";

const TARGET = "0x" + "1".repeat(40);
const ORIGINAL_DATA = "0x1234";
const REDSTONE_MARKER = consts.REDSTONE_MARKER_HEX.replace("0x", "");

describe("wrapPopulatableContract (v5/v6 abstraction path)", () => {
  it("appends the redstone payload to populateTransaction data and preserves the tx", async () => {
    const wrapper = new MockWrapper(mockNumericPackages);
    const populatable: PopulatableContract = {
      populateTransaction: {
        getValueForDataFeedId: () => Promise.resolve({ to: TARGET, data: ORIGINAL_DATA }),
      },
    };

    const wrapped = wrapper.overwriteEthersContract(populatable);

    const tx = await wrapped.populateTransaction.getValueForDataFeedId("0x00");
    const expectedPayload = await wrapper.getBytesDataForAppending();

    expect(tx.to).to.equal(TARGET);
    expect(tx.data).to.equal(ORIGINAL_DATA + expectedPayload);
    expect(tx.data?.endsWith(REDSTONE_MARKER)).to.equal(true);
  });
});

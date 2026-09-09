import { BigNumber } from "@ethersproject/bignumber";
import { Event } from "@ethersproject/contracts";
import { expect } from "chai";
import { WrapperBuilder } from "../../src";
import { SampleWithEvents } from "../../typechain-types";
import { deployContract, mockNumericPackages } from "../tests-common";

describe("SampleWithEvents", function () {
  let sampleContract: SampleWithEvents;

  beforeEach(async () => {
    ({ contract: sampleContract } = await deployContract<SampleWithEvents>("SampleWithEvents"));
  });

  it("Test events with contract wrapping", async function () {
    // Wrapping the contract instance
    const wrappedContract =
      WrapperBuilder.wrap(sampleContract).usingMockDataPackages(mockNumericPackages);

    // Sending tx
    const tx = await wrappedContract.emitEventWithLatestOracleValue();
    const receipt = await tx.wait();
    const event: Event = receipt.events![0];

    // Receipt should have parsed events
    expect(receipt.events!.length).to.be.equal(1);
    expect((event.args!._updatedValue! as BigNumber).toNumber()).to.be.gt(0);
    expect(event.event).to.be.equal("ValueUpdated");
  });
});

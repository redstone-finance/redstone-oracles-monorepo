import { consts, utils } from "@redstone-finance/protocol";
import { expect } from "chai";
import { WrapperBuilder } from "../../src";
import { SampleRedstoneConsumerNumericMock } from "../../typechain-types";
import { deployContract, mockNumericPackages } from "../tests-common";

describe("PopulateTransactionTest", function () {
  it("Should overwrite populateTransaction", async () => {
    // Deploying the contract
    const { contract } = await deployContract<SampleRedstoneConsumerNumericMock>(
      "SampleRedstoneConsumerNumericMock"
    );

    // Wrapping the contract
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);

    // Prepare calldata for original and wrapped contracts
    const dataFeedId = utils.convertStringToBytes32("ETH");
    const originalTxPopulated =
      await contract.populateTransaction["getValueForDataFeedId"](dataFeedId);
    const wrappedTxPopulated =
      await wrappedContract.populateTransaction["getValueForDataFeedId"](dataFeedId);

    // Checking the calldata
    const redstoneMarker = consts.REDSTONE_MARKER_HEX.replace("0x", "");
    expect(originalTxPopulated.data)
      .to.be.a("string")
      .and.satisfy((str: string) => !str.endsWith(redstoneMarker));
    expect(wrappedTxPopulated.data)
      .to.be.a("string")
      .and.satisfy((str: string) => str.endsWith(redstoneMarker));
  });
});

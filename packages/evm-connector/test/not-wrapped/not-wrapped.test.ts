import { utils } from "@redstone-finance/protocol";
import { expect } from "chai";
import { SampleRedstoneConsumerNumericMock } from "../../typechain-types";
import { deployContract } from "../tests-common";

describe("Not Wrapped Contract", function () {
  let contract: SampleRedstoneConsumerNumericMock;

  this.beforeEach(async () => {
    ({ contract } = await deployContract<SampleRedstoneConsumerNumericMock>(
      "SampleRedstoneConsumerNumericMock"
    ));
  });

  it("Should revert if contract was not wrapped", async () => {
    await expect(contract.saveOracleValueInContractStorage(utils.convertStringToBytes32("BTC")))
      .to.be.revertedWithCustomError(contract, "CalldataMustHaveValidPayload")
      .withArgs();
  });
});

import { utils } from "@redstone-finance/protocol";
import hre from "hardhat";
import { expectCustomError } from "../assertions";
import { deployContract } from "../commons";
import { SampleRedstoneConsumerNumericMock } from "../contract-types";

describe("Not Wrapped Contract", function () {
  let contract: SampleRedstoneConsumerNumericMock;

  this.beforeEach(async () => {
    ({ contract } = await deployContract<SampleRedstoneConsumerNumericMock>(
      hre,
      "SampleRedstoneConsumerNumericMock"
    ));
  });

  it("Should revert if contract was not wrapped", async () => {
    await expectCustomError(
      contract,
      "CalldataMustHaveValidPayload",
      () => contract.saveOracleValueInContractStorage(utils.convertStringToBytes32("BTC")),
      []
    );
  });
});

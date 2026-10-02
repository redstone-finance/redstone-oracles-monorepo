import { utils } from "@redstone-finance/protocol";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import hre from "hardhat";
import { DataPackagesWrapper, WrapperBuilder } from "../../src";
import { deployContract } from "../commons";
import { SampleRedstoneConsumerNumericMockManyDataFeeds } from "../contract-types";
import { expectedNumericValues } from "../tests-common";
import { getValidDataPackagesResponse } from "./helpers";

chai.use(chaiAsPromised);

describe("DataPackagesWrapper", () => {
  let contract: SampleRedstoneConsumerNumericMockManyDataFeeds;
  const dataFeedIds = [utils.convertStringToBytes32("ETH"), utils.convertStringToBytes32("BTC")];

  const checkExpectedValues = async () => {
    const firstValueFromContract = await contract.firstValue();
    const secondValueFromContract = await contract.secondValue();

    expect(firstValueFromContract.toNumber()).to.be.equal(expectedNumericValues["ETH"]);
    expect(secondValueFromContract.toNumber()).to.be.equal(expectedNumericValues["BTC"]);
  };

  beforeEach(async () => {
    ({ contract } = await deployContract<SampleRedstoneConsumerNumericMockManyDataFeeds>(
      hre,
      "SampleRedstoneConsumerNumericMockManyDataFeeds"
    ));
  });

  it("Should properly execute", async () => {
    const dataPackagesResponse = getValidDataPackagesResponse();
    const wrappedContract = WrapperBuilder.wrap(contract).usingDataPackages(dataPackagesResponse);

    const tx = await wrappedContract.save2ValuesInStorage(dataFeedIds);
    await tx.wait();
    await checkExpectedValues();
  });

  it("Should work properly with manual payload", async () => {
    const dataPackagesResponse = getValidDataPackagesResponse();
    const dpWrapper = new DataPackagesWrapper(dataPackagesResponse);
    const redstonePayload = await dpWrapper.getRedstonePayloadForManualUsage(contract);
    const tx = await contract.save2ValuesInStorageWithManualPayload(dataFeedIds, redstonePayload);
    await tx.wait();
    await checkExpectedValues();
  });
});

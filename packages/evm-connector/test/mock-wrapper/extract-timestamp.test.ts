import hre from "hardhat";
import { DEFAULT_TIMESTAMP_FOR_TESTS, getMockNumericPackage, WrapperBuilder } from "../../src";
import { expectCustomError, expectNumber } from "../assertions";
import { deployContract } from "../commons";
import { SampleRedstoneConsumerNumericMock } from "../contract-types";
import { mockNumericPackages } from "../tests-common";

const getSimpleTestPackageWithTimestamp = (timestamp: number) =>
  getMockNumericPackage({
    mockSignerIndex: 0,
    timestampMilliseconds: timestamp,
    dataPoints: [{ dataFeedId: "BTC", value: 123 }],
  });

describe("Extract Timestamp", function () {
  let sampleContract: SampleRedstoneConsumerNumericMock;

  beforeEach(async () => {
    ({ contract: sampleContract } = await deployContract<SampleRedstoneConsumerNumericMock>(
      hre,
      "SampleRedstoneConsumerNumericMock"
    ));
  });

  it("Should extract timestamp correctly", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(sampleContract).usingMockDataPackages(mockNumericPackages);

    const timestamp = await wrappedContract.extractTimestampFromRedstonePayload();

    expectNumber(timestamp, DEFAULT_TIMESTAMP_FOR_TESTS);
  });

  it("Should revert if 2 timestamps are not equal", async () => {
    const wrappedContract = WrapperBuilder.wrap(sampleContract).usingMockDataPackages([
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS),
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS + 1),
    ]);

    await expectCustomError(
      wrappedContract,
      "DataPackageTimestampsMustBeEqual",
      async () => await wrappedContract.extractTimestampFromRedstonePayload()
    );
  });

  it("Should revert if one of many timestamps is different", async () => {
    const wrappedContract = WrapperBuilder.wrap(sampleContract).usingMockDataPackages([
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS),
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS),
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS),
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS + 1),
      getSimpleTestPackageWithTimestamp(DEFAULT_TIMESTAMP_FOR_TESTS),
    ]);

    await expectCustomError(
      wrappedContract,
      "DataPackageTimestampsMustBeEqual",
      async () => await wrappedContract.extractTimestampFromRedstonePayload()
    );
  });
});

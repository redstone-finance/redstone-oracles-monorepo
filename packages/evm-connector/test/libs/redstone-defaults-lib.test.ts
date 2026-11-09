import { expect } from "chai";
import hre from "hardhat";
import { expectCustomError } from "../assertions.js";
import { deployContract } from "../commons.js";
import { SampleRedstoneDefaultsLib } from "../contract-types.js";
import { getBlockTimestampMilliseconds } from "../tests-common.js";

const MILLISECONDS_IN_MINUTE = 60 * 1000;

describe("SampleRedstoneDefaultsLib", function () {
  let contract: SampleRedstoneDefaultsLib;

  beforeEach(async () => {
    ({ contract } = await deployContract<SampleRedstoneDefaultsLib>(
      hre,
      "SampleRedstoneDefaultsLib"
    ));
  });

  it("Should properly validate valid timestamps", async () => {
    const timestamp = await getBlockTimestampMilliseconds(hre);
    await contract.validateTimestamp(BigInt(timestamp));
    await contract.validateTimestamp(BigInt(timestamp + 0.5 * MILLISECONDS_IN_MINUTE));
    await contract.validateTimestamp(BigInt(timestamp - 2.5 * MILLISECONDS_IN_MINUTE));
  });

  it("Should revert for too old timestamp", async () => {
    const timestamp = await getBlockTimestampMilliseconds(hre);
    await expectCustomError(contract, "TimestampIsTooOld", () =>
      contract.validateTimestamp(BigInt(timestamp - 4 * MILLISECONDS_IN_MINUTE))
    );
  });

  it("Should revert for timestamp from too long future", async () => {
    const timestamp = await getBlockTimestampMilliseconds(hre);
    await expectCustomError(contract, "TimestampFromTooLongFuture", () =>
      contract.validateTimestamp(BigInt(timestamp + 2 * MILLISECONDS_IN_MINUTE))
    );
  });

  it("Should properly aggregate an array with 1 value", async () => {
    const aggregatedValue = await contract.aggregateValues([42n]);
    expect(aggregatedValue.toNumber()).to.eql(42);
  });

  it("Should properly aggregate an array with 3 values", async () => {
    const aggregatedValue = await contract.aggregateValues([41n, 43n, 42n]);
    expect(aggregatedValue.toNumber()).to.eql(42);
  });

  it("Should properly aggregate an array with 4 values", async () => {
    const aggregatedValue = await contract.aggregateValues([38n, 44n, 40n, 100n]);
    expect(aggregatedValue.toNumber()).to.eql(42);
  });

  it("Should properly aggregate an array with values, which include a very big number", async () => {
    const aggregatedValue = await contract.aggregateValues([44n, 10n ** 36n, 40n, 10n]);
    expect(aggregatedValue.toNumber()).to.eql(42);
  });

  it("Should properly aggregate an array with values, which include zeros", async () => {
    const aggregatedValue = await contract.aggregateValues([44n, 0n, 68n, 0n, 100n, 0n, 42n]);
    expect(aggregatedValue.toNumber()).to.eql(42);
  });

  it("Should revert trying to aggregate an empty array", async () => {
    await expectCustomError(contract, "CanNotPickMedianOfEmptyArray", () =>
      contract.aggregateValues([])
    );
  });
});

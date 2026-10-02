import { utils } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import hre from "hardhat";
import {
  DEFAULT_TIMESTAMP_FOR_TESTS,
  MockDataPackageConfig,
  MockSignerIndex,
  WrapperBuilder,
  getMockNumericPackage,
  getRange,
} from "../../src";
import { expectCustomError, expectNumber } from "../assertions";
import { deployContract } from "../commons";
import { SampleProxyConnector } from "../contract-types";
import {
  NUMBER_OF_MOCK_NUMERIC_SIGNERS,
  UNAUTHORISED_SIGNER_INDEX,
  expectedNumericValues,
  mockNumericPackageConfigs,
  mockNumericPackages,
} from "../tests-common";

describe("SampleProxyConnector", function () {
  let contract: SampleProxyConnector;
  const ethDataFeedId = utils.convertStringToBytes32("ETH");

  const testShouldRevertWith = async (
    mockPackages: MockDataPackageConfig[],
    revertMsg: string,
    ...args: unknown[]
  ) => {
    const wrappedContract = WrapperBuilder.wrap(contract).usingMockDataPackages(mockPackages);
    await expectCustomError(
      wrappedContract,
      revertMsg,
      async () => await wrappedContract.getOracleValueUsingProxy(ethDataFeedId),
      args
    );
  };

  this.beforeEach(async () => {
    ({ contract } = await deployContract<SampleProxyConnector>(hre, "SampleProxyConnector"));
  });

  it("Should return correct oracle value for one asset", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);

    const fetchedValue = await wrappedContract.getOracleValueUsingProxy(ethDataFeedId);
    expectNumber(fetchedValue, expectedNumericValues.ETH);
  });

  it("Should return correct oracle values for 10 assets", async () => {
    const dataPoints = [
      { dataFeedId: "ETH", value: 4000 },
      { dataFeedId: "AVAX", value: 5 },
      { dataFeedId: "BTC", value: 100000 },
      { dataFeedId: "LINK", value: 2 },
      { dataFeedId: "UNI", value: 200 },
      { dataFeedId: "FRAX", value: 1 },
      { dataFeedId: "OMG", value: 0.00003 },
      { dataFeedId: "DOGE", value: 2 },
      { dataFeedId: "SOL", value: 11 },
      { dataFeedId: "BNB", value: 31 },
    ];

    const mockNumericPackages = getRange({
      start: 0,
      length: NUMBER_OF_MOCK_NUMERIC_SIGNERS,
    }).map((i) =>
      getMockNumericPackage({
        dataPoints,
        mockSignerIndex: i as MockSignerIndex,
      })
    );

    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);

    for (const dataPoint of dataPoints) {
      await wrappedContract.checkOracleValue(
        utils.convertStringToBytes32(dataPoint.dataFeedId),
        Math.round(dataPoint.value * 10 ** 8)
      );
    }
  });

  it("Should forward msg.value", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);
    await wrappedContract.requireValueForward({
      value: RedstoneCommon.parseUnits("2137"),
    });
  });

  it("Should work properly with long encoded functions", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);
    await wrappedContract.checkOracleValueLongEncodedFunction(
      ethDataFeedId,
      expectedNumericValues.ETH
    );
    await expectCustomError(
      wrappedContract,
      "WrongValue",
      async () => await wrappedContract.checkOracleValueLongEncodedFunction(ethDataFeedId, 9999),
      []
    );
  });

  it("Should fail with correct message (timestamp invalid)", async () => {
    const newMockPackages = mockNumericPackageConfigs.map((config) =>
      getMockNumericPackage({
        ...config,
        timestampMilliseconds: DEFAULT_TIMESTAMP_FOR_TESTS - 1,
      })
    );
    await testShouldRevertWith(newMockPackages, "ProxyCalldataFailedWithCustomError", "0x355b8743");
  });

  it("Should fail with correct message (different timestamps)", async () => {
    const newMockPackages = [...mockNumericPackages];
    newMockPackages[1] = getMockNumericPackage({
      ...mockNumericPackageConfigs[1],
      timestampMilliseconds: DEFAULT_TIMESTAMP_FOR_TESTS - 1,
    });
    await testShouldRevertWith(newMockPackages, "ProxyCalldataFailedWithCustomError", "0x4cbc4742");
  });

  it("Should fail with correct message (insufficient number of unique signers)", async () => {
    const newMockPackages = mockNumericPackages.slice(0, NUMBER_OF_MOCK_NUMERIC_SIGNERS - 1);
    await testShouldRevertWith(
      newMockPackages,
      "ProxyCalldataFailedWithCustomError",
      "0x2b13aef50000000000000000000000000000000000000000000000000000000000000009000000000000000000000000000000000000000000000000000000000000000a"
    );
  });

  it("Should fail with correct message (signer is not authorised)", async () => {
    const newMockPackages = [...mockNumericPackages];
    newMockPackages[1] = getMockNumericPackage({
      ...mockNumericPackageConfigs[1],
      mockSignerIndex: UNAUTHORISED_SIGNER_INDEX,
    });
    await testShouldRevertWith(
      newMockPackages,
      "ProxyCalldataFailedWithCustomError",
      "0xec459bc00000000000000000000000008626f6940e2eb28930efb4cef49b2d1f2c9c1199"
    );
  });

  it("Should fail with correct message (no error message)", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);
    await expectCustomError(
      wrappedContract,
      "ProxyCalldataFailedWithoutErrMsg",
      async () => await wrappedContract.proxyEmptyError()
    );
  });

  it("Should fail with correct message (string test message)", async () => {
    const wrappedContract =
      WrapperBuilder.wrap(contract).usingMockDataPackages(mockNumericPackages);
    await expectCustomError(
      wrappedContract,
      "ProxyCalldataFailedWithStringMessage",
      async () => await wrappedContract.proxyTestStringError(),
      ["Test message"]
    );
  });
});

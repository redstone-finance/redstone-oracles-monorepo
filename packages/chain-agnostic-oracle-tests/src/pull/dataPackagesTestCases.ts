import { INumericDataPoint, RedstonePayload, SignedDataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  basicPullModelTestConfig,
  testDataPoint,
  testDataPoints,
  to8Decimals,
  UNSIGNED_METADATA,
} from "../common";
import { getMockSignedDataPackageObj, MockSignerIndex } from "../test-utils";
import { PullModelTestCase } from "../types";

const { toOrdinal } = RedstoneCommon;
const duplicatedDataFeeds = [testDataPoint, testDataPoint];

const generateDataPackagesTest = (
  dataPointsForPackages: { dataFeedId: string; value: number }[][],
  expectedSuccess: boolean,
  newExpectedValue?: number
): PullModelTestCase => {
  return {
    ...basicPullModelTestConfig,
    expectedSuccess,
    expectedValues: RedstoneCommon.isDefined(newExpectedValue)
      ? [newExpectedValue]
      : basicPullModelTestConfig.expectedValues,
    payloadGenerator: (timestamp: number) => {
      const signedMockdataPackages = [];
      for (let signerIndex = 0; signerIndex < dataPointsForPackages.length; signerIndex++) {
        const mdp = getMockSignedDataPackageObj({
          dataPoints: dataPointsForPackages[signerIndex],
          mockSignerIndex: signerIndex as MockSignerIndex,
          timestampMilliseconds: timestamp,
        });
        signedMockdataPackages.push(SignedDataPackage.fromObj(mdp));
      }

      return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
    },
  };
};

export const dataPackagesTestCases = {
  "Should work with no duplications": generateDataPackagesTest(
    [[testDataPoint], [testDataPoint], [testDataPoint]],
    true
  ),

  "Should fail if there are data packages with a duplicated data feed": {
    "First signer tries to hack the system with 2 duplicated data points": generateDataPackagesTest(
      [[testDataPoint, testDataPoint], [testDataPoint]],
      false
    ),
    "Second signer tries to hack the system with 2 duplicated data points":
      generateDataPackagesTest([[testDataPoint], [testDataPoint, testDataPoint]], false),
    ...Object.fromEntries(
      [3, 4, 5].map((i) => [
        `First signer tries to hack the system with ${i} duplicated data points`,
        generateDataPackagesTest([Array(i).fill(testDataPoint) as INumericDataPoint[]], false),
      ])
    ),
  },

  "Should fail if there are data packages with a duplicated data feed (even if there are enough signers)":
    {
      ...Object.fromEntries(
        [0, 1, 2].map((i) => {
          const dataPointsForPackages = [...testDataPoints];
          dataPointsForPackages[i] = duplicatedDataFeeds;
          return [
            `${toOrdinal(i + 1)} data package has a duplicated feed, rest is good`,
            generateDataPackagesTest(dataPointsForPackages, false),
          ];
        })
      ),
      "All data packages have a duplicated feed": generateDataPackagesTest(
        [duplicatedDataFeeds, duplicatedDataFeeds, duplicatedDataFeeds],
        false
      ),
    },

  "Should fail if there is an empty data package": {
    ...Object.fromEntries(
      [0, 1, 2].map((i) => {
        const dataPointsForPackages = [...testDataPoints];
        dataPointsForPackages[i] = [];
        return [
          `${toOrdinal(i + 1)} data package is empty, rest is good`,
          generateDataPackagesTest(dataPointsForPackages, false),
        ];
      })
    ),
    "All data packages are empty": generateDataPackagesTest([[], [], []], false),
  },

  "Data packages order should not change anything": {
    ...Object.fromEntries(
      [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 1, 0],
        [2, 0, 1],
      ].map((order) => {
        const dps = [...testDataPoints];
        const reorderedTestsDataPoints = [dps[order[0]], dps[order[1]], dps[order[2]]];
        return [
          `Order ${JSON.stringify(order)} should yield the same result`,
          generateDataPackagesTest(reorderedTestsDataPoints, true),
        ];
      })
    ),
  },

  "Additional valid data packages should not change aggregated value (if it's added to the 'beginning' - because parsing should be reversed)":
    {
      ...Object.fromEntries(
        [
          {
            title: "Added 4th data package with value 41",
            indexes: [0, 0, 1, 2],
          },
          {
            title: "Added 4th data package with value 43",
            indexes: [1, 0, 1, 2],
          },
          {
            title: "Added 4th data package with value 42",
            indexes: [2, 0, 1, 2],
          },
          {
            title: "Added 4th and 5th data package with values 41 and 43",
            indexes: [0, 1, 0, 1, 2],
          },
        ].map(({ title, indexes }) => {
          const dps = [...testDataPoints];
          const dataPointsForPackages = indexes.map((i) => dps[i]);
          return [title, generateDataPackagesTest(dataPointsForPackages, true)];
        })
      ),
    },

  "Additional valid data packages should change aggregated value (if it's added to the 'end' - because parsing should be reversed)":
    {
      ...Object.fromEntries(
        [
          {
            title: "Added 4th data package with value 41",
            indexes: [0, 1, 2, 0],
            newValue: 42,
          },
          {
            title: "Added 4th data package with value 43",
            indexes: [0, 1, 2, 1],
            newValue: 43,
          },
          {
            title: "Added 4th data package with value 42",
            indexes: [0, 1, 2, 2],
            newValue: 42,
          },
          {
            title: "Added 4th and 5th data package with values 43 and 43",
            indexes: [0, 1, 2, 1, 1],
            newValue: 43,
          },
        ].map(({ title, indexes, newValue }) => {
          const dps = [...testDataPoints];
          const dataPointsForPackages = indexes.map((i) => dps[i]);
          return [
            title,
            generateDataPackagesTest(dataPointsForPackages, true, to8Decimals(newValue)),
          ];
        })
      ),
    },
};

export const nonEvmAdditionalTests = {
  "Additional data packages should change aggregated value": {
    ...Object.fromEntries(
      [
        {
          title: "Added 4th data package with value 41",
          indexes: [0, 0, 1, 2],
          newValue: 41.5,
        },
        {
          title: "Added 4th data package with value 42",
          indexes: [2, 0, 1, 2],
          newValue: 42.5,
        },
        {
          title: "Added 4th and 5th data package with values 41 and 43",
          indexes: [0, 1, 0, 1, 2],
          newValue: 42,
        },
        {
          title: "Added 4th data package with value 43",
          indexes: [0, 1, 2, 1],
          newValue: 42.5,
        },
        {
          title: "Added 4th data package with value 42",
          indexes: [0, 1, 2, 2],
          newValue: 42,
        },
        {
          title: "Added 4th and 5th data package with values 43 and 43",
          indexes: [0, 1, 2, 1, 1],
          newValue: 43,
        },
      ].map(({ title, indexes, newValue }) => {
        const dps = [...testDataPoints];
        const dataPointsForPackages = indexes.map((i) => dps[i]);
        return [
          title,
          generateDataPackagesTest(dataPointsForPackages, true, to8Decimals(newValue)),
        ];
      })
    ),
  },
};

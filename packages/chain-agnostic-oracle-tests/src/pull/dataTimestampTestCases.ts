import { RedstonePayload, SignedDataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import { basicPullModelTestConfig, testDataPoints, UNSIGNED_METADATA } from "../common";
import { getMockSignedDataPackageObj, MockSignerIndex } from "../test-utils";

const { toOrdinal } = RedstoneCommon;

const generateTestCasesWithTimestampOffsets = (
  offsetArrays: number[],
  expectedSuccess: boolean
) => {
  return Object.fromEntries(
    offsetArrays.map((offset) => [
      `Test with offset: ${offset}`,
      {
        ...basicPullModelTestConfig,
        payloadGenerator: (timestamp: number) =>
          basicPullModelTestConfig.payloadGenerator(timestamp + offset * 1000),
        expectedSuccess,
      },
    ])
  );
};

export const dataTimestampTestCases = {
  "Equal timestamp in all packages": {
    "Should revert with too old data": generateTestCasesWithTimestampOffsets(
      [-500, -400, -300, -181],
      false
    ),
    "Should work with old (but not outdated) data": generateTestCasesWithTimestampOffsets(
      [-179, -150, -100, -50, -20, -10, -5, -1],
      true
    ),
    "Should work with data.time == block.time": generateTestCasesWithTimestampOffsets([0], true),
    "Should work with data from close future": generateTestCasesWithTimestampOffsets(
      [1, 3, 5, 10, 30, 59],
      true
    ),
    "Should revert with data from far future": generateTestCasesWithTimestampOffsets(
      [61, 62, 65, 70, 100, 500, 1000],
      false
    ),
  },

  "Some timestamps are not equal": {
    ...Object.fromEntries(
      [0, 1, 2].map((dpIndexWithDifferentTimestamp) => [
        `Should fail if ${toOrdinal(dpIndexWithDifferentTimestamp + 1)} timestamp is not equal to the rest`,
        {
          ...basicPullModelTestConfig,
          expectedSuccess: false,
          payloadGenerator: (timestamp: number) => {
            const signedMockdataPackages = [0, 1, 2].map((i) => {
              const mdp = getMockSignedDataPackageObj({
                dataPoints: testDataPoints[i],
                mockSignerIndex: i as MockSignerIndex,
                timestampMilliseconds:
                  dpIndexWithDifferentTimestamp === i ? timestamp + 1 : timestamp, // changing timestamp for the selected package
              });
              return SignedDataPackage.fromObj(mdp);
            });

            return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
          },
        },
      ])
    ),
    "Should fail if all timestamps are different": {
      ...basicPullModelTestConfig,
      expectedSuccess: false,
      payloadGenerator: (timestamp: number) => {
        const signedMockdataPackages = [0, 1, 2].map((i) => {
          const mdp = getMockSignedDataPackageObj({
            dataPoints: testDataPoints[i],
            mockSignerIndex: i as MockSignerIndex,
            timestampMilliseconds: timestamp + i, // changing timestamp
          });
          return SignedDataPackage.fromObj(mdp);
        });

        return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
      },
    },
  },
};

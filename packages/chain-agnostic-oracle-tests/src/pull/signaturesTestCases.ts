import { RedstonePayload, SignedDataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import { basicPullModelTestConfig, UNSIGNED_METADATA } from "../common";
import { getMockSignedDataPackageObj, MockSignerIndex } from "../test-utils";

const { toOrdinal } = RedstoneCommon;

const generateTestConfigWithSignerIndexes = (signerIndexes: number[], expectedSuccess: boolean) => {
  return {
    ...basicPullModelTestConfig,
    expectedSuccess,
    payloadGenerator: (timestamp: number) => {
      const dataPoints = [{ dataFeedId: "ETH", value: 42 }];
      const signedMockdataPackages = signerIndexes
        .map((mockSignerIndex: number) =>
          getMockSignedDataPackageObj({
            dataPoints,
            mockSignerIndex: mockSignerIndex as MockSignerIndex,
            timestampMilliseconds: timestamp,
          })
        )
        .map((mdp) => SignedDataPackage.fromObj(mdp));
      return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
    },
  };
};

export const signaturesTestCases = {
  "Not enough signatures should fail": {
    ...Object.fromEntries(
      [0, 1, 2].map((n) => [
        `Only ${n} signed data packages are in payload`,
        generateTestConfigWithSignerIndexes([0, 1, 2].slice(0, n), false),
      ])
    ),
  },

  "Invalid signature should fail": {
    ...Object.fromEntries(
      [0, 1, 2].map((i) => {
        const signerIndexes = [0, 1, 2];
        signerIndexes[i] = 11;
        return [
          `${toOrdinal(i + 1)} data package has an invalid signature (unauthorised signer), rest is good`,
          basicPullModelTestConfig,
        ];
      })
    ),
    "All data packages have invalid signatures": generateTestConfigWithSignerIndexes(
      [11, 12, 13],
      false
    ),
  },

  "Order of signatures should not change anything": {
    ...Object.fromEntries(
      [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 1, 0],
        [2, 0, 1],
      ].map((signerIndexes) => [
        `Should work with valid signatures (${signerIndexes.join(", ")})`,
        generateTestConfigWithSignerIndexes(signerIndexes, true),
      ])
    ),
  },

  "Duplicated signatures": {
    "Should fail if all signatures are the same": generateTestConfigWithSignerIndexes(
      [0, 0, 0],
      false
    ),
    ...Object.fromEntries(
      [0, 1, 2].map((i) => {
        const signerIndexes = i > 0 ? [0, 0, 0] : [1, 1, 1];
        signerIndexes[i] = i;
        return [
          `Should fail if only ${toOrdinal(i + 1)} data package has unique signature, rest - the same (${signerIndexes.join(", ")})`,
          generateTestConfigWithSignerIndexes(signerIndexes, false),
        ];
      })
    ),
    ...Object.fromEntries(
      [0, 1, 2].map((i) => {
        const signerIndexes = [0, 1, 2];
        signerIndexes.push(i);
        return [
          `Should fail if 4th data package has the same signature as ${toOrdinal(i + 1)} data package (${signerIndexes.join(", ")})`,
          generateTestConfigWithSignerIndexes(signerIndexes, false),
        ];
      })
    ),
    ...Object.fromEntries(
      [0, 1, 2].map((i) => {
        const signerIndexes = [0, 1, 2];
        signerIndexes.push(i);
        signerIndexes.push(i);
        return [
          `Should fail if 4th and 5th data packages have the same signatures as ${toOrdinal(i + 1)} data package (${signerIndexes.join(", ")})`,
          generateTestConfigWithSignerIndexes(signerIndexes, false),
        ];
      })
    ),
  },
};

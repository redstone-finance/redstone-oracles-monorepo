import { INumericDataPoint, RedstonePayload, SignedDataPackage } from "@redstone-finance/protocol";
import { getMockSignedDataPackageObj, MOCK_SIGNERS, MockSignerIndex } from "./test-utils";
import {
  PullModelTestCase,
  PushModelInstruction,
  PushModelTestCase,
  PushModelTestContext,
} from "./types";

export interface SimpleUpdateInstruction {
  valueToPush: number;
  expectedValue: number;
  waitForNewBlockBeforeUpdate: boolean;
  dataTimestampDiffWithBlockTimestamp?: number;
}

export const UNSIGNED_METADATA = "dynamic-tests-spec";

export const defaultContractConfiguration = {
  authorisedSigners: MOCK_SIGNERS,
  requiredSignersCount: 3,
};

export const testDataPoint: INumericDataPoint = {
  dataFeedId: "ETH",
  value: 42,
};

export const testDataPoints: INumericDataPoint[][] = [
  [{ dataFeedId: "ETH", value: 41 }],
  [{ dataFeedId: "ETH", value: 43 }],
  [{ dataFeedId: "ETH", value: 42 }],
];

export const to8Decimals = (n: number) => n * 10 ** 8;

export const basicPullModelTestConfig: PullModelTestCase = {
  payloadGenerator: (timestamp: number) => {
    const signedMockdataPackages = [0, 1, 2].map((i) => {
      const mdp = getMockSignedDataPackageObj({
        dataPoints: testDataPoints[i],
        mockSignerIndex: i as MockSignerIndex,
        timestampMilliseconds: timestamp,
      });
      return SignedDataPackage.fromObj(mdp);
    });

    return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
  },

  contractConfiguration: defaultContractConfiguration,

  requestedDataFeedIds: ["ETH"],
  expectedSuccess: true,
  expectedValues: [to8Decimals(42)],
  isPullModelTestCase: true,
};

export const generatePayloadWithETH = (value: number, dataTimestamp: number) => {
  const dataPoints = [{ dataFeedId: "ETH", value }];
  const signedMockdataPackages = [
    getMockSignedDataPackageObj({
      dataPoints,
      mockSignerIndex: 0,
      timestampMilliseconds: dataTimestamp,
    }),
    getMockSignedDataPackageObj({
      dataPoints,
      mockSignerIndex: 1,
      timestampMilliseconds: dataTimestamp,
    }),
    getMockSignedDataPackageObj({
      dataPoints,
      mockSignerIndex: 2,
      timestampMilliseconds: dataTimestamp,
    }),
  ].map((mdp) => SignedDataPackage.fromObj(mdp));

  return RedstonePayload.prepare(signedMockdataPackages, UNSIGNED_METADATA);
};

export const generateTestConfigForSequenceOfUpdates = (
  updates: SimpleUpdateInstruction[]
): PushModelTestCase => {
  const instructions: PushModelInstruction[] = [];
  for (const update of updates) {
    if (update.waitForNewBlockBeforeUpdate) {
      instructions.push({
        type: "waitfornewblock",
      });
    }

    instructions.push({
      expectedSuccess: true, // Invalid updates don't revert, they just have no effect
      type: "update",
      payloadGenerator: (context: PushModelTestContext) =>
        generatePayloadWithETH(
          update.valueToPush,
          context.timestamp + (update.dataTimestampDiffWithBlockTimestamp ?? 0)
        ),
      dataFeedIds: ["ETH"],
      expectedValues: [to8Decimals(update.expectedValue)],
    });
  }

  return {
    isPushModelTestCase: true,
    contractConfiguration: defaultContractConfiguration,
    instructions,
  };
};

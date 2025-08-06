import {
  defaultContractConfiguration,
  generatePayloadWithETH,
  generateTestConfigForSequenceOfUpdates,
  SimpleUpdateInstruction,
  to8Decimals,
} from "../../common";
import {
  Nested,
  PushModelTestCase,
  PushModelTestContext,
  PushModelUpdateInstruction,
} from "../../types";

const generateTestCasesWithTimestampDiffBetweenUpdates = (args: {
  timestampDiffs: number[];
  shouldSecondUpdateChangeTheValue: boolean;
  shouldSecondUpdateRevert: boolean;
}): Record<string, PushModelTestCase> => {
  const updateInstructionConfig: PushModelUpdateInstruction = {
    expectedSuccess: true, // Invalid updates (of this type) don't revert, they just have no effect
    type: "update",
    payloadGenerator: (context: PushModelTestContext) =>
      generatePayloadWithETH(42, context.timestamp),
    dataFeedIds: ["ETH"],
    expectedValues: [to8Decimals(42)],
  };

  return Object.fromEntries(
    args.timestampDiffs.map((diffInSecondsBetweenUpdates) => [
      `Test with diff: ${diffInSecondsBetweenUpdates}`,
      {
        isPushModelTestCase: true,
        contractConfiguration: defaultContractConfiguration,
        instructions: [
          {
            type: "waitfornewblock",
          },
          { ...updateInstructionConfig },
          {
            type: "waitfornewblock",
          },
          {
            ...updateInstructionConfig,
            expectedSuccess: !args.shouldSecondUpdateRevert,
            payloadGenerator: (context: PushModelTestContext) =>
              generatePayloadWithETH(
                43,
                context.instructions[1].timestamp +
                  diffInSecondsBetweenUpdates * 1000
              ),
            expectedValues: [
              to8Decimals(args.shouldSecondUpdateChangeTheValue ? 43 : 42),
            ],
          },
        ],
      },
    ])
  );
};

const generateTestCasesWithTimestampOffsetsForBlockTimestamp = (
  offsetArrays: number[],
  expectedSuccess: boolean
): Record<string, PushModelTestCase> => {
  return Object.fromEntries(
    offsetArrays.map((offsetSeconds) => [
      `Test with offset in seconds: ${offsetSeconds}`,
      {
        isPushModelTestCase: true,
        contractConfiguration: defaultContractConfiguration,
        instructions: [
          {
            type: "waitfornewblock",
          },
          {
            expectedSuccess,
            type: "update",
            payloadGenerator: (context: PushModelTestContext) =>
              generatePayloadWithETH(
                42,
                context.timestamp + offsetSeconds * 1000
              ),
            dataFeedIds: ["ETH"],
            expectedValues: [to8Decimals(42)],
          },
        ],
      },
    ])
  );
};

// These tests partly duplicate pull model tests, but it's intentional
// Duplicated tests here increase reliability, similarly to redundancy in monitoring

export const timestampChecks: Nested<PushModelTestCase> = {
  "Current data timestamp should be newer than the data timestamp from the latest update":
    {
      "Too old timestamp should revert":
        generateTestCasesWithTimestampDiffBetweenUpdates({
          timestampDiffs: [-1000, -500, -200],
          shouldSecondUpdateRevert: true,
          shouldSecondUpdateChangeTheValue: false,
        }),
      "Non-newer timestamp should not revert, but should have not effect":
        generateTestCasesWithTimestampDiffBetweenUpdates({
          timestampDiffs: [-100, -50, -20, -10, -5, -3],
          shouldSecondUpdateRevert: false,
          shouldSecondUpdateChangeTheValue: false,
        }),
      "Same timestamp should not revert, but should have not effect":
        generateTestCasesWithTimestampDiffBetweenUpdates({
          timestampDiffs: [0],
          shouldSecondUpdateRevert: false,
          shouldSecondUpdateChangeTheValue: false,
        }),
      "Newer timestamp should be ok":
        generateTestCasesWithTimestampDiffBetweenUpdates({
          timestampDiffs: [1, 2, 5, 10, 30, 59],
          shouldSecondUpdateRevert: false,
          shouldSecondUpdateChangeTheValue: true,
        }),
      "Too future timestamps should revert":
        generateTestCasesWithTimestampDiffBetweenUpdates({
          // This set of tests assumes that block.time for `waitfornewblock` instruction doesn't increase more than by 10 seconds
          timestampDiffs: [71, 75, 80, 100, 200, 300, 500],
          shouldSecondUpdateRevert: true,
          shouldSecondUpdateChangeTheValue: false,
        }),
    },

  "Data timestamp should be fresh but not from too long future": {
    "Should revert with too old data":
      generateTestCasesWithTimestampOffsetsForBlockTimestamp(
        [-500, -400, -300, -181],
        false
      ),
    "Should work with old (but not outdated) data":
      generateTestCasesWithTimestampOffsetsForBlockTimestamp(
        [-169, -150, -100, -50, -20, -10, -5, -1],
        true
      ),
    "Should work with data.time == block.time":
      generateTestCasesWithTimestampOffsetsForBlockTimestamp([0], true),
    "Should work with data from close future":
      generateTestCasesWithTimestampOffsetsForBlockTimestamp(
        [1, 3, 5, 10, 30, 59],
        true
      ),
    "Should revert with data from far future":
      generateTestCasesWithTimestampOffsetsForBlockTimestamp(
        [61, 62, 65, 70, 100, 500, 1000],
        false
      ),
  },

  "Current block timestamp should be greater than block timestamp from last update":
    {
      "Should fail trying to update few times in the same block (with dataTimestamp = block.timestamp)":
        {
          ...Object.fromEntries(
            [1, 2, 5, 10, 30].map((numberOfUpdates) => {
              const updates: SimpleUpdateInstruction[] = [];

              // Valid update with value 42
              updates.push({
                valueToPush: 42,
                waitForNewBlockBeforeUpdate: true,
                expectedValue: 42,
              });

              // Many updates in the same block (with the same data timestamp)
              for (let i = 0; i < numberOfUpdates; i++) {
                updates.push({
                  valueToPush: i + 1,
                  waitForNewBlockBeforeUpdate: false,
                  expectedValue: 42,
                });
              }

              // Valid update with value 43
              updates.push({
                valueToPush: 43,
                waitForNewBlockBeforeUpdate: true,
                expectedValue: 43,
              });

              return [
                `Should fail trying to update ${numberOfUpdates} times`,
                generateTestConfigForSequenceOfUpdates(updates),
              ];
            })
          ),
        },

      "Should fail trying to update few times in the same block (even with increasing dataTimestamp in each try)":
        {
          ...Object.fromEntries(
            [1, 2, 5, 10].map((numberOfUpdates) => {
              const updates: SimpleUpdateInstruction[] = [];

              // Valid update with value 42
              updates.push({
                valueToPush: 42,
                waitForNewBlockBeforeUpdate: true,
                expectedValue: 42,
              });

              // Many updates in the same block (with increasing data timestamp)
              // Since we increase the dataTimestamp by one second in each update
              // the `numberOfUpdates` variable should not be bigger then 180 in this test
              for (let i = 0; i < numberOfUpdates; i++) {
                updates.push({
                  valueToPush: i + 1,
                  dataTimestampDiffWithBlockTimestamp: i + 1, // increasing data timestamp
                  waitForNewBlockBeforeUpdate: false,
                  expectedValue: 42,
                });
              }

              // Valid update with value 43
              updates.push({
                valueToPush: 43,
                waitForNewBlockBeforeUpdate: true,
                dataTimestampDiffWithBlockTimestamp: numberOfUpdates + 2,
                expectedValue: 43,
              });

              return [
                `Should fail trying to update ${numberOfUpdates} times`,
                generateTestConfigForSequenceOfUpdates(updates),
              ];
            })
          ),
        },
    },
};

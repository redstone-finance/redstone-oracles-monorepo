import {
  defaultContractConfiguration,
  generatePayloadWithETH,
  to8Decimals,
} from "../../common";
import { Nested, PushModelTestCase, PushModelTestContext } from "../../types";

const generateTestCasesForStaleDataRead = (
  hoursToWaitArr: number[],
  expectedSuccess: boolean
): Record<string, PushModelTestCase> => {
  return Object.fromEntries(
    hoursToWaitArr.map((hoursToWait) => [
      `Test with stale data by ${hoursToWait} hours`,
      {
        isPushModelTestCase: true,
        contractConfiguration: defaultContractConfiguration,
        instructions: [
          {
            type: "waitfornewblock",
          },
          {
            expectedSuccess: true,
            type: "update",
            payloadGenerator: (context: PushModelTestContext) =>
              generatePayloadWithETH(420, context.timestamp),
            dataFeedIds: ["ETH"],
            expectedValues: [to8Decimals(420)],
          },
          {
            type: "wait",
            durationSeconds: hoursToWait * 3600,
          },
          {
            type: "read",
            dataFeedIds: ["ETH"],
            expectedValues: [to8Decimals(420)],
            expectedSuccess,
          },
        ],
      },
    ])
  );
};

export const dataReadChecks: Nested<PushModelTestCase> = {
  "Should fail for missing data": {
    isPushModelTestCase: true,
    contractConfiguration: defaultContractConfiguration,
    instructions: [
      {
        type: "waitfornewblock",
      },
      {
        type: "read",
        dataFeedIds: ["ETH"],
        expectedSuccess: false,
      },
    ],
  },

  "Should fail for stale data": generateTestCasesForStaleDataRead(
    [300, 100, 50, 40, 31, 30],
    false
  ),

  "Should read data properly for old, but non-stale data:":
    generateTestCasesForStaleDataRead(
      [29, 28, 25, 20, 10, 5, 3, 2, 1, 0],
      true
    ),
};

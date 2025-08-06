import {
  generateTestConfigForSequenceOfUpdates,
  SimpleUpdateInstruction,
} from "../../common";
import { Nested, PushModelTestCase } from "../../types";

const testSequences: boolean[][] = [
  [true, false, true],
  [true, true, false, true],
  [true, false, true, true],
  [true, false, true, true],
  [true, false, true, false, true, true],
  [true, false, false, false, true, false, true],
];

export const sequenceOfUpdates: Nested<PushModelTestCase> = {
  "Sequential correct updates": {
    ...Object.fromEntries(
      [2, 5, 10, 20, 50].map((numberOfUpdates) => {
        const updates: SimpleUpdateInstruction[] = [];
        for (let i = 0; i < numberOfUpdates; i++) {
          updates.push({
            valueToPush: i + 1,
            expectedValue: i + 1,
            waitForNewBlockBeforeUpdate: true,
          });
        }
        const testConfig = generateTestConfigForSequenceOfUpdates(updates);
        return [`Should properly update ${numberOfUpdates} times`, testConfig];
      })
    ),
  },

  "Incorrect update(s) (with zero value) should not break future correct updates":
    {
      ...Object.fromEntries(
        testSequences.map((sequence) => {
          const updates: SimpleUpdateInstruction[] = [];
          let lastSuccessfulValue = 0;
          for (let i = 0; i < sequence.length; i++) {
            const shouldPushInvalidValue = !sequence[i];
            const valueToPush = shouldPushInvalidValue ? 0 : i + 1;
            updates.push({
              valueToPush,
              expectedValue: shouldPushInvalidValue
                ? lastSuccessfulValue
                : valueToPush,
              waitForNewBlockBeforeUpdate: true,
            });

            if (!shouldPushInvalidValue) {
              lastSuccessfulValue = valueToPush;
            }
          }
          const testConfig = generateTestConfigForSequenceOfUpdates(updates);
          return [
            `Values to be pushed: ${updates.map((u) => u.valueToPush).join(", ")}`,
            testConfig,
          ];
        })
      ),
    },

  "Incorrect update(s) (in the same block) should not break future correct updates":
    {
      ...Object.fromEntries(
        testSequences.map((sequence) => {
          const updates: SimpleUpdateInstruction[] = [];
          let lastSuccessfulValue = 0;
          for (let i = 0; i < sequence.length; i++) {
            const waitForNewBlockBeforeUpdate = sequence[i];
            const valueToPush = i + 1;
            updates.push({
              waitForNewBlockBeforeUpdate,
              valueToPush,
              expectedValue: waitForNewBlockBeforeUpdate
                ? valueToPush
                : lastSuccessfulValue,
            });

            if (waitForNewBlockBeforeUpdate) {
              lastSuccessfulValue = valueToPush;
            }
          }
          const testConfig = generateTestConfigForSequenceOfUpdates(updates);
          return [
            `Values to be pushed (| separates blocks): ${updates.map((u) => `${u.waitForNewBlockBeforeUpdate ? " |" : ""} ${u.valueToPush}`).join("")}`,
            testConfig,
          ];
        })
      ),
    },
};

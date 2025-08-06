import { generateTestConfigForSequenceOfUpdates } from "../../common";
import { Nested, PushModelTestCase } from "../../types";

export const valueChecks: Nested<PushModelTestCase> = {
  "Shouldn't update with zero value": generateTestConfigForSequenceOfUpdates([
    {
      valueToPush: 10,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 10,
    },
    {
      valueToPush: 0,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 10,
    },
    {
      valueToPush: 11,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 11,
    },
    {
      valueToPush: 0,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 11,
    },
    {
      valueToPush: 0,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 11,
    },
    {
      valueToPush: 9,
      waitForNewBlockBeforeUpdate: true,
      expectedValue: 9,
    },
  ]),
};

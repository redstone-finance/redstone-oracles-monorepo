import { Nested, PushModelTestCase } from "../types";
import { dataReadChecks } from "./read/dataReadChecks";
import { sequenceOfUpdates } from "./write/sequenceOfUpdates";
import { timestampChecks } from "./write/timestampChecks";
import { valueChecks } from "./write/valueChecks";

const pushModelTestCases: Record<string, Nested<PushModelTestCase>> = {
  "Data write": {
    "Sequence of updates": sequenceOfUpdates,
    "Timestamp checks": timestampChecks,
    "Value checks": valueChecks,
  },
  "Data read": dataReadChecks,
};

export default pushModelTestCases;

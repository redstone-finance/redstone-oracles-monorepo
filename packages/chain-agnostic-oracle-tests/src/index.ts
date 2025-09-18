import pullModelTestCases from "./pull";
import pushModelTestCases from "./push";

import { FullTestSpec } from "./types";

export { generatePullTestsFor, generatePushTestsFor } from "./executor";
export type { PullTestEnvironment, PushTestEnvironment } from "./executor";

export const fullTestsSpec: FullTestSpec = {
  "Pull model": pullModelTestCases,
  "Push model": pushModelTestCases,
};

export * from "./test-utils";
export * from "./type-guards";
export * from "./types";

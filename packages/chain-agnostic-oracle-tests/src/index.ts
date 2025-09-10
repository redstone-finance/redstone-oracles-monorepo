import pullModelTestCases from "./pull";
import pushModelTestCases from "./push";
import { FullTestSpec, Nested, PullModelTestCase, PushModelTestCase } from "./types";

export const fullTestsSpec: FullTestSpec = {
  "Pull model": pullModelTestCases,
  "Push model": pushModelTestCases,
};

export const isPullModelTestCase = (
  config: Nested<PullModelTestCase>
): config is PullModelTestCase => {
  return Boolean((config as PullModelTestCase).isPullModelTestCase);
};

export const isPushModelTestCase = (
  config: Nested<PushModelTestCase>
): config is PushModelTestCase => {
  return Boolean((config as PushModelTestCase).isPushModelTestCase);
};

export * from "./test-utils";
export * from "./types";

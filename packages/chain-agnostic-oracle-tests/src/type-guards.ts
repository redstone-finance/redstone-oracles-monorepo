import { Nested, PullModelTestCase, PushModelTestCase } from "./types";

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

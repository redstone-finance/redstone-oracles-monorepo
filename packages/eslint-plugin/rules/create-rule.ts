import { ESLintUtils } from "@typescript-eslint/utils";

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://redstone.finance/eslint/rules/${name}`
);

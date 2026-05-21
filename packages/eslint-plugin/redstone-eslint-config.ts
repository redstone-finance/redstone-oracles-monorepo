import type { FlatConfig } from "typescript-eslint";
import { noDecimalComparison } from "./rules/no-decimal-comparison";
import noRedundantVoid from "./rules/no-redundant-void-return";

const redstonePlugin = {
  rules: {
    "no-decimal-comparison": noDecimalComparison,
    "no-redundant-void": noRedundantVoid,
  },
};

export const redstoneConfig: FlatConfig.Config[] = [
  {
    plugins: {
      redstonePlugin,
    },
    rules: {
      "redstonePlugin/no-decimal-comparison": "error",
      "redstonePlugin/no-redundant-void": "error",
    },
  },
];

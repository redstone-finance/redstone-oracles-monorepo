declare module "eslint-plugin-array-func" {
  import type { Linter } from "eslint";

  const arrayFunc: {
    configs: {
      recommended: Linter.Config;
    };
  };

  export default arrayFunc;
}

declare module "@eslint-community/eslint-plugin-eslint-comments/configs" {
  import type { Linter } from "eslint";

  const recommended: Linter.Config;
}

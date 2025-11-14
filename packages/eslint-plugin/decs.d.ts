declare module "eslint-plugin-array-func" {
  import type { Linter } from "eslint";

  const arrayFunc: {
    configs: {
      recommended: Linter.Config;
    };
  };

  export default arrayFunc;
}

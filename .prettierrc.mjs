import redstonePrettierConfig from "redstone-prettier-config";

export default {
  ...redstonePrettierConfig,
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-solidity"],
};

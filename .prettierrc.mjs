import companyPrettier from "redstone-prettier-config";

export default {
  ...companyPrettier,
  printWidth: 100,
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-solidity"],
};

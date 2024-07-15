import fs from "fs";

type PackageJson = {
  dependencies: Record<string, string>;
  resolutions: Record<string, string>;
};
const main = () => {
  const versionToSet = process.argv[2];
  const packageJson =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-unresolved
    require("../sdk-test-app/package.json") as unknown as PackageJson;
  packageJson.dependencies["@redstone-finance/evm-connector"] = versionToSet;
  packageJson.resolutions["@redstone-finance/oracles-smartweave-contracts"] =
    versionToSet;
  packageJson.resolutions["@redstone-finance/protocol"] = versionToSet;
  packageJson.resolutions["@redstone-finance/sdk"] = versionToSet;
  packageJson.resolutions["@redstone-finance/utils"] = versionToSet;
  fs.writeFileSync(
    "./sdk-test-app/package.json",
    JSON.stringify(packageJson, null, 2)
  );
};

void main();

const fs = require("fs");

const MAIN_MANIFESTS_PATH = "../main/relayer-manifests-multi-feed";
const FALLBACK_MANIFESTS_PATH = "../fallback/relayer-manifests-multi-feed";

const NON_EVM_MAIN_MANIFESTS_PATH = "../main/relayer-manifests-non-evm";
const NON_EVM_FALLBACK_MANIFESTS_PATH = "../fallback/relayer-manifests-non-evm";

(() => {
  const mainManifestPaths = fs.readdirSync(MAIN_MANIFESTS_PATH, "utf8");

  for (const manifestPath of mainManifestPaths) {
    const manifest = fs.readFileSync(`${MAIN_MANIFESTS_PATH}/${manifestPath}`);
    fs.writeFileSync(`${FALLBACK_MANIFESTS_PATH}/${manifestPath}`, manifest);
  }

  const nonEvmMainManifestPaths = fs.readdirSync(NON_EVM_MAIN_MANIFESTS_PATH, "utf8");

  for (const manifestPath of nonEvmMainManifestPaths) {
    const manifest = fs.readFileSync(`${NON_EVM_MAIN_MANIFESTS_PATH}/${manifestPath}`);
    fs.writeFileSync(`${NON_EVM_FALLBACK_MANIFESTS_PATH}/${manifestPath}`, manifest);
  }
})();

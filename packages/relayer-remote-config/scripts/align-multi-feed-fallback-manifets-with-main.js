const fs = require("fs");

const MAIN_MANIFESTS_PATH = "../main/relayer-manifests-multi-feed";
const FALLBACK_MANIFESTS_PATH = "../fallback/relayer-manifests-multi-feed";

(() => {
  const mainManifestPaths = fs.readdirSync(MAIN_MANIFESTS_PATH, "utf8");

  for (const manifestPath of mainManifestPaths) {
    const manifest = fs.readFileSync(`${MAIN_MANIFESTS_PATH}/${manifestPath}`);
    fs.writeFileSync(`${FALLBACK_MANIFESTS_PATH}/${manifestPath}`, manifest);
  }
})();

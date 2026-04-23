import { RedstoneCommon } from "@redstone-finance/utils";
import { MANIFEST_DIRS, ManifestType } from "../schemas";

export function getOnChainRelayerBasePath() {
  return RedstoneCommon.path.join(__dirname, "../../../../relayer-remote-config/main");
}

export const removeFileExtension = (fileName: string): string => {
  return RedstoneCommon.getFilenameWithoutExtension(fileName);
};

export function readDataFromDir(name: string, dir: string, baseDir: string) {
  name = name.endsWith(".json") ? name : `${name}.json`;
  const path = RedstoneCommon.path.join(baseDir, dir);

  return RedstoneCommon.fs.readFileSync(RedstoneCommon.path.join(path, name));
}

export function readData(name: string, type: ManifestType, baseDir: string) {
  return readDataFromDir(name, MANIFEST_DIRS[type], baseDir);
}

export function readManifestFiles(type: ManifestType, baseDir: string) {
  const dir = RedstoneCommon.path.join(baseDir, MANIFEST_DIRS[type]);

  return RedstoneCommon.fs.readdirSync(dir);
}

export function splitManifestUrl(urlString: string) {
  const match = urlString.match(/^https:\/\/(?:[^/]+\/)+([^/]+)\/([^/]+\.json)$/);

  if (!match) {
    throw new Error(`Invalid manifest URL: ${urlString}`);
  }

  return {
    dir: match[1],
    filename: match[2],
  };
}

import { RedstoneCommon } from "@redstone-finance/utils";
import { MANIFEST_DIRS, ManifestType } from "../schemas";

export function getOnChainRelayerBasePath() {
  return RedstoneCommon.path.join(
    __dirname,
    "../../../../relayer-remote-config/main"
  );
}

export const removeFileExtension = (fileName: string): string => {
  return RedstoneCommon.getFilenameWithoutExtension(fileName);
};

export function readData(name: string, type: ManifestType, directory: string) {
  const dir = RedstoneCommon.path.join(directory, MANIFEST_DIRS[type]);
  name = name.endsWith(".json") ? name : `${name}.json`;

  return RedstoneCommon.fs.readFileSync(RedstoneCommon.path.join(dir, name));
}

export function readManifestFiles(type: ManifestType, directory: string) {
  const dir = RedstoneCommon.path.join(directory, MANIFEST_DIRS[type]);

  return RedstoneCommon.fs.readdirSync(dir);
}

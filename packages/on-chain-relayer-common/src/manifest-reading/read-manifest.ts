import {
  CommonManifestSchemaStrict,
  MANIFEST_TYPE_MULTI_FEED,
  MANIFEST_TYPE_NON_EVM,
  MANIFEST_TYPE_PRICE_FEEDS,
  ManifestType,
  MultiFeedOnChainRelayerManifest,
  MultiFeedOnChainRelayerManifestSchemaStrict,
  OnChainRelayerManifest,
  OnChainRelayerManifestSchemaStrict,
} from "../schemas";
import {
  getOnChainRelayerBasePath,
  readData,
  readDataFromDir,
  splitManifestUrl,
} from "./read-utils";

export function readAnyManifest(
  type: ManifestType,
  name: string,
  directory = getOnChainRelayerBasePath()
): OnChainRelayerManifest | MultiFeedOnChainRelayerManifest {
  const data = readData(name, type, directory);

  return (
    type === MANIFEST_TYPE_PRICE_FEEDS
      ? OnChainRelayerManifestSchemaStrict
      : MultiFeedOnChainRelayerManifestSchemaStrict
  )
    .strict()
    .parse(JSON.parse(data.toString()));
}

export function readManifest(
  type: typeof MANIFEST_TYPE_PRICE_FEEDS,
  name: string,
  directory: string
): OnChainRelayerManifest;
export function readManifest(
  type: typeof MANIFEST_TYPE_MULTI_FEED,
  name: string,
  directory: string
): MultiFeedOnChainRelayerManifest;
export function readManifest(
  type: typeof MANIFEST_TYPE_NON_EVM,
  name: string,
  directory: string
): MultiFeedOnChainRelayerManifest;
export function readManifest(
  type: ManifestType,
  name: string,
  directory = getOnChainRelayerBasePath()
) {
  return readAnyManifest(type, name, directory);
}

export function readAnyRelayerManifestWithUrl(
  url: string,
  manifestsDir = getOnChainRelayerBasePath()
) {
  const { dir, filename } = splitManifestUrl(url);
  const data = readDataFromDir(filename, dir, manifestsDir);

  return CommonManifestSchemaStrict.strict().parse(JSON.parse(data.toString()));
}

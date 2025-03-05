import _ from "lodash";
import {
  CommonRelayerManifest,
  MultiFeedOnChainRelayerManifest,
  OnChainRelayerManifest,
} from "../..";
import {
  MANIFEST_TYPE_MULTI_FEED,
  MANIFEST_TYPE_NON_EVM,
  MANIFEST_TYPE_PRICE_FEEDS,
  ManifestType,
  readAnyManifest,
} from "./read-manifest";
import {
  getOnChainRelayerBasePath,
  readManifestFiles,
  removeFileExtension,
} from "./read-utils";

export function readManifests(
  type: typeof MANIFEST_TYPE_PRICE_FEEDS,
  directory: string
): Record<string, OnChainRelayerManifest>;
export function readManifests(
  type: typeof MANIFEST_TYPE_MULTI_FEED,
  directory: string
): Record<string, MultiFeedOnChainRelayerManifest>;
export function readManifests(
  type: typeof MANIFEST_TYPE_NON_EVM,
  directory: string
): Record<string, MultiFeedOnChainRelayerManifest>;
export function readManifests(
  type: ManifestType,
  directory = getOnChainRelayerBasePath()
): Record<string, OnChainRelayerManifest | MultiFeedOnChainRelayerManifest> {
  const manifests: Record<
    string,
    OnChainRelayerManifest | MultiFeedOnChainRelayerManifest
  > = {};
  const files = readManifestFiles(type, directory);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    manifests[removeFileExtension(file)] = readAnyManifest(
      type,
      file,
      directory
    );
  }

  return manifests;
}

export const readClassicManifests = (
  directory = getOnChainRelayerBasePath()
) => {
  return readManifests(MANIFEST_TYPE_PRICE_FEEDS, directory);
};

export const readMultiFeedManifests = (
  directory = getOnChainRelayerBasePath()
) => {
  return readManifests(MANIFEST_TYPE_MULTI_FEED, directory);
};

export const readNonEvmManifests = (
  directory = getOnChainRelayerBasePath()
) => {
  return readManifests(MANIFEST_TYPE_NON_EVM, directory);
};

export const readAllManifestsAsCommon = (
  directory = getOnChainRelayerBasePath()
) => {
  const manifests: Record<string, CommonRelayerManifest> = _.assign(
    {},
    readClassicManifests(directory),
    readMultiFeedManifests(directory),
    readNonEvmManifests(directory)
  );

  return manifests;
};

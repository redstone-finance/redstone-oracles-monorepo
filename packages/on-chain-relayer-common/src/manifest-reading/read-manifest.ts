import {
  MultiFeedOnChainRelayerManifest,
  MultiFeedOnChainRelayerManifestSchema,
  OnChainRelayerManifest,
  OnChainRelayerManifestSchema,
} from "../schemas";
import { getOnChainRelayerBasePath, readData } from "./read-utils";

export type ManifestType =
  | typeof MANIFEST_TYPE_PRICE_FEEDS
  | typeof MANIFEST_TYPE_MULTI_FEED
  | typeof MANIFEST_TYPE_NON_EVM;

export const MANIFEST_TYPE_PRICE_FEEDS = "price-feeds";
export const MANIFEST_TYPE_MULTI_FEED = "multi-feed";
export const MANIFEST_TYPE_NON_EVM = "non-evm";

export const MANIFEST_DIRS: Record<ManifestType, string> = {
  [MANIFEST_TYPE_PRICE_FEEDS]: "relayer-manifests",
  [MANIFEST_TYPE_MULTI_FEED]: "relayer-manifests-multi-feed",
  [MANIFEST_TYPE_NON_EVM]: "relayer-manifests-non-evm",
};

export function readAnyManifest(
  type: ManifestType,
  name: string,
  directory = getOnChainRelayerBasePath()
): OnChainRelayerManifest | MultiFeedOnChainRelayerManifest {
  const data = readData(name, type, directory);

  return (
    type === MANIFEST_TYPE_PRICE_FEEDS
      ? OnChainRelayerManifestSchema
      : MultiFeedOnChainRelayerManifestSchema
  ).parse(JSON.parse(data.toString()));
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

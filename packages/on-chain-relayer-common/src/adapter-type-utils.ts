import {
  AdapterType,
  AnyOnChainRelayerManifest,
  MULTI_FEED,
  MultiFeedOnChainRelayerManifest,
  STYLUS,
} from "./schemas";

export function isMultiFeedRelayerManifest(
  manifest: AnyOnChainRelayerManifest
): manifest is MultiFeedOnChainRelayerManifest {
  return isMultiFeedAdapterType(manifest.adapterContractType);
}

export function isMultiFeedAdapterType(adapterContractType: AdapterType) {
  return [MULTI_FEED, STYLUS].includes(adapterContractType);
}

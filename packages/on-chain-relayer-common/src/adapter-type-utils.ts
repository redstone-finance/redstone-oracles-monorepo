import { AdapterType, AnyOnChainRelayerManifest, MultiFeedOnChainRelayerManifest } from "./schemas";

export function isMultiFeedRelayerManifest(
  manifest: AnyOnChainRelayerManifest
): manifest is MultiFeedOnChainRelayerManifest {
  return isMultiFeedAdapterType(manifest.adapterContractType);
}

export function isMultiFeedAdapterType(adapterContractType: AdapterType) {
  return adapterContractType === "multi-feed";
}

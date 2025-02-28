import { AnyRelayerManifestConfig } from "@redstone-finance/monitoring-manifests";
import { CommonRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
import { RedstoneCommon } from "@redstone-finance/utils";

export function findRelayerManifest(
  relayerId: string,
  monitoringManifest: AnyRelayerManifestConfig,
  relayerManifests: Record<string, CommonRelayerManifest>
) {
  const { relayerManifestUrls } = monitoringManifest[relayerId];

  const manifestName = RedstoneCommon.getFilenameWithoutExtension(
    relayerManifestUrls[0]
  );

  return {
    ...monitoringManifest[relayerId],
    relayerManifest: relayerManifests[manifestName],
  };
}

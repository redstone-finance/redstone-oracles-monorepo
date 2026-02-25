import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import { ManifestReading } from "@redstone-finance/on-chain-relayer-common";
import type { NetworkId } from "@redstone-finance/utils";
import { describe, test } from "mocha";

describe("Chain config presence", () => {
  test("There should be a chain config for each chain used in relayer manifests", () => {
    const networkIds: Set<NetworkId> = new Set();

    const classicManifests = ManifestReading.readClassicManifests();
    for (const manifest of Object.values(classicManifests)) {
      networkIds.add(manifest.chain.id);
    }

    const multiFeedManifests = ManifestReading.readMultiFeedManifests();
    for (const manifest of Object.values(multiFeedManifests)) {
      networkIds.add(manifest.chain.id);
    }

    const nonEvmManifests = ManifestReading.readNonEvmManifests();
    for (const manifest of Object.values(nonEvmManifests)) {
      networkIds.add(manifest.chain.id);
    }

    for (const networkId of Array.from(networkIds)) {
      getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
    }
  });
});

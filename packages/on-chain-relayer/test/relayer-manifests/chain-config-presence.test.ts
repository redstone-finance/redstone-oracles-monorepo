import {
  getChainConfigByChainId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { getChainTypeFromAdapterType } from "@redstone-finance/chain-orchestrator";
import { ManifestReading } from "@redstone-finance/on-chain-relayer-common";
import { describe, test } from "mocha";
import path from "path";

describe("Chain config presence", () => {
  test("There should be a chain config for each chain used in relayer manifests", () => {
    const chainIds: Set<number> = new Set();

    const classicManifests = ManifestReading.readClassicManifests(
      path.join(__dirname, "../..")
    );
    for (const manifest of Object.values(classicManifests)) {
      chainIds.add(manifest.chain.id);
    }

    const multiFeedManifests = ManifestReading.readMultiFeedManifests(
      path.join(__dirname, "../..")
    );
    for (const manifest of Object.values(multiFeedManifests)) {
      chainIds.add(manifest.chain.id);
    }

    for (const chainId of Array.from(chainIds)) {
      getChainConfigByChainId(getLocalChainConfigs(), chainId);
    }
  });

  test("There should be a chain config for each chain used in non-evm relayer manifests", () => {
    const nonEvmManifests = ManifestReading.readNonEvmManifests(
      path.join(__dirname, "../..")
    );

    for (const manifest of Object.values(nonEvmManifests)) {
      getChainConfigByChainId(
        getLocalChainConfigs(),
        manifest.chain.id,
        getChainTypeFromAdapterType(manifest.adapterContractType)
      );
    }
  });
});

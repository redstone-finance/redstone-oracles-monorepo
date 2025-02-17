import {
  getChainConfigByChainId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { describe, test } from "mocha";
import {
  readClassicManifests,
  readMultiFeedManifests,
  readNonEvmManifests,
} from "../../scripts/read-manifests";
import { getChainTypeFromAdapterType } from "../../src";

describe("Chain config presence", () => {
  test("There should be a chain config for each chain used in relayer manifests", () => {
    const chainIds: Set<number> = new Set();

    const classicManifests = readClassicManifests();
    for (const manifest of Object.values(classicManifests)) {
      chainIds.add(manifest.chain.id);
    }

    const multiFeedManifests = readMultiFeedManifests();
    for (const manifest of Object.values(multiFeedManifests)) {
      chainIds.add(manifest.chain.id);
    }

    for (const chainId of Array.from(chainIds)) {
      getChainConfigByChainId(getLocalChainConfigs(), chainId);
    }
  });

  test("There should be a chain config for each chain used in non-evm relayer manifests", () => {
    const nonEvmManifests = readNonEvmManifests();

    for (const manifest of Object.values(nonEvmManifests)) {
      getChainConfigByChainId(
        getLocalChainConfigs(),
        manifest.chain.id,
        getChainTypeFromAdapterType(manifest.adapterContractType)
      );
    }
  });
});

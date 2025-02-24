import {
  MultiFeedOnChainRelayerManifestSchemaStrict,
  OnChainRelayerManifestSchemaStrict,
} from "@redstone-finance/on-chain-relayer-common";
import { RedstoneCommon } from "@redstone-finance/utils";
import { describe, test } from "mocha";
import {
  readClassicManifests,
  readMultiFeedManifests,
  readNonEvmManifests,
} from "../../scripts/read-manifests";

const RELAYERS_DATA = {
  classic: {
    readManifests: readClassicManifests,
    schema: OnChainRelayerManifestSchemaStrict,
  },
  multiFeed: {
    readManifests: readMultiFeedManifests,
    schema: MultiFeedOnChainRelayerManifestSchemaStrict,
  },
  nonEvm: {
    readManifests: readNonEvmManifests,
    schema: MultiFeedOnChainRelayerManifestSchemaStrict,
  },
};

function tryParseManifests(type: keyof typeof RELAYERS_DATA) {
  const { readManifests, schema } = RELAYERS_DATA[type];

  const manifests = readManifests();
  for (const [relayerName, manifest] of Object.entries(manifests)) {
    try {
      schema.strict().parse(manifest);
    } catch (e) {
      throw new Error(
        `Manifest for relayer ${relayerName} failed schema validation: ${RedstoneCommon.stringifyError(e)}`
      );
    }
  }
}

describe("Relayer Manifests Validation", () => {
  Object.keys(RELAYERS_DATA).forEach((type) => {
    test(`Each ${type} relayer manifest should parse correctly`, () => {
      tryParseManifests(type as keyof typeof RELAYERS_DATA);
    });
  });
});

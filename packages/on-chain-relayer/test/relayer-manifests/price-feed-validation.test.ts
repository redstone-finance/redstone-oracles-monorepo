import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import {
  getPriceFeedAdapterCreator,
  getProviderWithRpcUrls,
  PriceFeedAdapterCreator,
} from "@redstone-finance/chain-orchestrator";
import {
  CommonRelayerManifest,
  getRelayerManifestFeedsWithAddresses,
  ManifestReading,
} from "@redstone-finance/on-chain-relayer-common";
import {
  isEvmNetworkId,
  NetworkId,
  NetworkIdSchema,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { expect } from "chai";
import { describe, test } from "mocha";
import { z } from "zod";

const INTEGRATIONS_NOT_FOR_TESTING = [
  "westendHubMultiFeed", // remove it when the network is stable
  "stylusSepoliaMultiFeed", // non supported in stylus
  "stellarTestnetSep40", // price adapter, not price feed
  "stellarSep40", // price adapter, not price feed
];

export const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

function getDisabledNetworks(): NetworkId[] {
  return [
    "radix/1",
    "radix/2",
    "canton/1",
    "canton/2",
    ...RedstoneCommon.getFromEnv("DISABLED_NETWORKS", z.array(NetworkIdSchema).default([])),
  ];
}

const priceFeedsCreators: Record<NetworkId, Promise<PriceFeedAdapterCreator>> = {};

function getPriceFeedCreatorFor(networkId: NetworkId) {
  return (priceFeedsCreators[networkId] ??= (async () => {
    const publicRpcUrls = getChainConfig(networkId).publicRpcUrls;

    return await getPriceFeedAdapterCreator(networkId, "dev", {
      provider: isEvmNetworkId(networkId)
        ? await getProviderWithRpcUrls(networkId, publicRpcUrls)
        : undefined,
      rpcUrls: publicRpcUrls,
    });
  })());
}

if (process.env.RUN_NONDETERMINISTIC_TESTS) {
  describe("Price feed contract should return the same dataFeedId as in relayer manifest", () => {
    const disabledNetworks = getDisabledNetworks();
    const manifests = ManifestReading.readAllManifestsAsCommon();

    const enabled = Object.entries(manifests).filter(([name, manifest]) =>
      checkShouldRun(manifest, name, disabledNetworks)
    );

    for (const [name, manifest] of enabled) {
      const networkId = manifest.chain.id;

      test(name, async () => {
        const priceFeedCreator = await getPriceFeedCreatorFor(networkId);
        const { manifestFeedsWithAddresses } = getRelayerManifestFeedsWithAddresses(manifest);
        const results = await Promise.all(
          // Multicall batches it
          manifestFeedsWithAddresses.map(([dataFeedId, priceFeedAddress]) =>
            checkDataFeedIdInContract(dataFeedId, priceFeedAddress, priceFeedCreator)
          )
        );

        for (const result of results) {
          expect(result).to.be.true;
        }
      });
    }
  });
}

function checkShouldRun(
  manifest: CommonRelayerManifest,
  name: string,
  disabledNetworks: NetworkId[]
) {
  if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
    console.log(`Integration ${name} is disabled`);

    return false;
  }
  if (getChainConfig(manifest.chain.id).publicRpcUrls.length === 0) {
    console.log(`No rpc urls defined for chain ${name}.`);

    return false;
  }
  if (disabledNetworks.includes(manifest.chain.id)) {
    console.log(`Network ${manifest.chain.id} is disabled`);

    return false;
  }

  return true;
}

function getChainConfig(networkId: NetworkId) {
  return getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
}

const checkDataFeedIdInContract = async (
  dataFeedId: string,
  address: string,
  priceFeedCreator: PriceFeedAdapterCreator,
  withRounds?: boolean
) => {
  const contract = await priceFeedCreator(address, dataFeedId, withRounds);

  try {
    const dataFeedIdFromContract = await RedstoneCommon.retry({
      fn: () => contract.getDataFeedId(),
      ...RETRY_CONFIG,
    })();
    if (dataFeedId === dataFeedIdFromContract) {
      return true;
    } else {
      console.log(
        `unexpected data feed id in contract: ${dataFeedIdFromContract}, expected: ${dataFeedId}`
      );

      return false;
    }
  } catch (e) {
    console.log(
      `contract.getDataFeedId failed for ${dataFeedId} with error: ${RedstoneCommon.stringifyError(e)}`
    );

    return false;
  }
};

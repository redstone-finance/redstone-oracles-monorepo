import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import {
  getPriceFeedContractCreator,
  getProviderWithRpcUrls,
} from "@redstone-finance/chain-orchestrator";
import {
  getRelayerManifestFeedsWithAddresses,
  ManifestReading,
} from "@redstone-finance/on-chain-relayer-common";
import { isEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { describe, test } from "mocha";

const INTEGRATIONS_NOT_FOR_TESTING = [
  "megaEthTestnetMultiFeed", // remove once we get a publicRpc
  "megaEthBoltMultiFeed", // remove once we get a publicRpc
  "megaEthReferenceMultiFeed", // remove once we get a publicRpc
  "megaEthMultiFeed", // remove once we get a publicRpc
  "citreaMultiFeed", // remove once we get a publicRpc
  "westendHubMultiFeed", // remove it when the network is stable

  "stylusSepoliaMultiFeed", // non supported in stylus
];

export const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

function getDisabledNetworks() {
  return ["radix/1", "radix/2", ...(process.env.DISABLED_NETWORKS ?? ([] as NetworkId[]))];
}

function getChainConfig(networkId: NetworkId) {
  return getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
}

const checkDataFeedIdInContract = async (
  dataFeedId: string,
  address: string,
  networkId: NetworkId
) => {
  const { publicRpcUrls } = getChainConfig(networkId);
  const priceFeedCreator = await getPriceFeedContractCreator(networkId, "dev", {
    provider: isEvmNetworkId(networkId)
      ? await getProviderWithRpcUrls(networkId, publicRpcUrls)
      : undefined,
    rpcUrls: publicRpcUrls,
  });
  const contract = await priceFeedCreator(address);

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

if (process.env.RUN_NONDETERMINISTIC_TESTS) {
  describe("Price feed contract should return the same dataFeedId as in relayer manifest", () => {
    const disabledNetworks = getDisabledNetworks();
    const manifests = ManifestReading.readAllManifestsAsCommon();
    for (const [name, manifest] of Object.entries(manifests)) {
      if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
        console.log(`Integration ${name} is disabled`);
        continue;
      }
      test(name, async () => {
        if (disabledNetworks.includes(manifest.chain.id)) {
          console.log(`Network ${manifest.chain.id} is disabled`);
          return;
        }
        const { manifestFeedsWithAddresses } = getRelayerManifestFeedsWithAddresses(manifest);

        for (const [dataFeedId, priceFeedAddress] of manifestFeedsWithAddresses) {
          expect(await checkDataFeedIdInContract(dataFeedId, priceFeedAddress, manifest.chain.id))
            .to.be.true;
        }
      });
    }
  });
}

import { getChainConfigByNetworkId, getLocalChainConfigs } from "@redstone-finance/chain-configs";
import { ManifestReading } from "@redstone-finance/on-chain-relayer-common";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import { isEvmNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { Bytes, Contract, ContractFunction, providers, utils } from "ethers";
import { describe, test } from "mocha";

const INTEGRATIONS_NOT_FOR_TESTING = [
  "megaEthTestnetMultiFeed", // remove once we get a publicRpc
  "megaEthBoltMultiFeed", // remove once we get a publicRpc
  "megaEthReferenceMultiFeed", // remove once we get a publicRpc
  "megaEthMultiFeed", // remove once we get a publicRpc
  "citreaMultiFeed", // remove once we get a publicRpc
  "westendHubMultiFeed", // remove it when the network is stable
];

const ABI = ["function getDataFeedId() public view returns (bytes32)"];

const CONNECTION_INFO = {
  throttleLimit: 1,
  timeout: 5_000,
};

export const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

function getChainConfig(networkId: NetworkId) {
  return getChainConfigByNetworkId(getLocalChainConfigs(), networkId);
}

/**
 * Since we're relying on an agreement provider,
 * there’s a chance one provider might be one(or more) blocks ahead of the others.
 * When awaiting the transaction, we wait only for the fastest provider, and then we verify the state in the next iteration.
 * If we're working with an outdated state based on the median block number,
 * we’ll trigger another transaction update to stay "current" - it is better to trigger extra transaction, then delay whole iteration
 */
const getProvider = (networkId: NetworkId): providers.Provider => {
  const { publicRpcUrls, name } = getChainConfig(networkId);
  if (!isEvmNetworkId(networkId)) {
    throw new Error("This test supports only evm chains.");
  }

  return new MegaProviderBuilder({
    rpcUrls: publicRpcUrls,
    network: {
      chainId: networkId,
      name,
    },
    ...CONNECTION_INFO,
  })
    .agreement(
      {
        allProvidersOperationTimeout: 30_000,
        singleProviderOperationTimeout: 5_000,
        ignoreAgreementOnInsufficientResponses: true,
        minimalProvidersCount: 2,
        requireExplicitBlockTag: false,
      },
      publicRpcUrls.length !== 1
    )
    .build();
};

const checkDataFeedIdInContract = async (
  dataFeedId: string,
  address: string,
  networkId: NetworkId
) => {
  const contract = new Contract(address, ABI, getProvider(networkId));
  try {
    const dataFeedIdFromContractAsBytes = await RedstoneCommon.retry({
      fn: () => (contract.getDataFeedId as ContractFunction<Bytes>)(),
      ...RETRY_CONFIG,
    })();
    const dataFeedIdFromContract = utils.parseBytes32String(dataFeedIdFromContractAsBytes);
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
    const disabledNetworks = (process.env.DISABLED_NETWORKS ?? []) as NetworkId[];
    const classicManifests = ManifestReading.readClassicManifests();
    for (const [name, manifest] of Object.entries(classicManifests)) {
      if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
        console.log(`Integration ${name} is disabled`);
        continue;
      }
      test(name, async () => {
        if (disabledNetworks.includes(manifest.chain.id)) {
          console.log(`Network ${manifest.chain.id} is disabled`);
          return;
        }
        for (const [dataFeedId, priceFeedAddress] of Object.entries(manifest.priceFeeds)) {
          if (priceFeedAddress !== "__NO_FEED__") {
            expect(await checkDataFeedIdInContract(dataFeedId, priceFeedAddress, manifest.chain.id))
              .to.be.true;
          }
        }
      });
    }

    const multiFeedManifests = ManifestReading.readMultiFeedManifests();
    for (const [name, manifest] of Object.entries(multiFeedManifests)) {
      if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
        console.log(`Integration ${name} is disabled`);
        continue;
      }
      test(name, async () => {
        if (disabledNetworks.includes(manifest.chain.id)) {
          console.log(`Network ${manifest.chain.id} is disabled`);
          return;
        }
        for (const [dataFeedId, { priceFeedAddress }] of Object.entries(manifest.priceFeeds)) {
          if (priceFeedAddress) {
            expect(await checkDataFeedIdInContract(dataFeedId, priceFeedAddress, manifest.chain.id))
              .to.be.true;
          }
        }
      });
    }
  });
}

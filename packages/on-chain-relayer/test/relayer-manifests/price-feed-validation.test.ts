import {
  getChainConfigByNetworkId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { ManifestReading } from "@redstone-finance/on-chain-relayer-common";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import {
  isEvmNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { expect } from "chai";
import { Bytes, Contract, ContractFunction, providers, utils } from "ethers";
import { describe, test } from "mocha";

const INTEGRATIONS_NOT_FOR_TESTING = [
  "hemiMultiFeed", // remove once we get a publicRpc
  "megaEthTestnetMultiFeed", // remove once we get a publicRpc
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
    const dataFeedIdFromContract = utils.parseBytes32String(
      dataFeedIdFromContractAsBytes
    );
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
      `contract.getFeedId failed with error: ${RedstoneCommon.stringifyError(e)}`
    );
    return false;
  }
};

if (process.env.RUN_NONDETERMINISTIC_TESTS) {
  describe("Price feed contract should return the same dataFeedId as in relayer manifest", () => {
    const classicManifests = ManifestReading.readClassicManifests();
    for (const [name, manifest] of Object.entries(classicManifests)) {
      test(name, async () => {
        for (const [dataFeedId, priceFeedAddress] of Object.entries(
          manifest.priceFeeds
        )) {
          const disabledNetworks = (process.env.DISABLED_NETWORKS ??
            []) as NetworkId[];

          if (
            priceFeedAddress !== "__NO_FEED__" &&
            disabledNetworks.includes(manifest.chain.id)
          ) {
            expect(
              await checkDataFeedIdInContract(
                dataFeedId,
                priceFeedAddress,
                manifest.chain.id
              )
            ).to.be.true;
          }
        }
      });
    }

    const multiFeedManifests = ManifestReading.readMultiFeedManifests();
    for (const [name, manifest] of Object.entries(multiFeedManifests)) {
      if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
        continue;
      }
      test(name, async () => {
        for (const [dataFeedId, { priceFeedAddress }] of Object.entries(
          manifest.priceFeeds
        )) {
          const disabledNetworks = (process.env.DISABLED_NETWORKS ??
            []) as NetworkId[];

          if (
            priceFeedAddress &&
            disabledNetworks.includes(manifest.chain.id)
          ) {
            expect(
              await checkDataFeedIdInContract(
                dataFeedId,
                priceFeedAddress,
                manifest.chain.id
              )
            ).to.be.true;
          }
        }
      });
    }
  });
}

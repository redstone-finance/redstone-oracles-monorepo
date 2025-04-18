import {
  ChainType,
  getChainConfigByChainId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { ManifestReading } from "@redstone-finance/on-chain-relayer-common";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { Bytes, Contract, ContractFunction, providers, utils } from "ethers";
import { describe, test } from "mocha";
import path from "path";

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

function getChainConfig(chainId: number, chainType?: ChainType) {
  return getChainConfigByChainId(getLocalChainConfigs(), chainId, chainType);
}

/**
 * Since we're relying on an agreement provider,
 * there’s a chance one provider might be one(or more) blocks ahead of the others.
 * When awaiting the transaction, we wait only for the fastest provider, and then we verify the state in the next iteration.
 * If we're working with an outdated state based on the median block number,
 * we’ll trigger another transaction update to stay "current" - it is better to trigger extra transaction, then delay whole iteration
 */
const getProvider = (chainId: number): providers.Provider => {
  const { publicRpcUrls, name } = getChainConfig(chainId);

  return new MegaProviderBuilder({
    rpcUrls: publicRpcUrls,
    network: {
      chainId,
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
  chainId: number
) => {
  const contract = new Contract(address, ABI, getProvider(chainId));
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

describe("Price feed contract should return the same dataFeedId as in relayer manifest", () => {
  const classicManifests = ManifestReading.readClassicManifests(
    path.join(__dirname, "../..")
  );
  for (const [name, manifest] of Object.entries(classicManifests)) {
    test(name, async () => {
      for (const [dataFeedId, priceFeedAddress] of Object.entries(
        manifest.priceFeeds
      )) {
        const config = getChainConfig(manifest.chain.id);

        if (priceFeedAddress !== "__NO_FEED__" && !config.disabled) {
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

  const mutliFeedManifests = ManifestReading.readMultiFeedManifests(
    path.join(__dirname, "../..")
  );
  for (const [name, manifest] of Object.entries(mutliFeedManifests)) {
    if (INTEGRATIONS_NOT_FOR_TESTING.includes(name)) {
      continue;
    }
    test(name, async () => {
      for (const [dataFeedId, { priceFeedAddress }] of Object.entries(
        manifest.priceFeeds
      )) {
        const config = getChainConfig(manifest.chain.id);

        if (priceFeedAddress && !config.disabled) {
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

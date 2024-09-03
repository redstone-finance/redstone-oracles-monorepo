import {
  getChainConfigByChainId,
  MegaProviderBuilder,
} from "@redstone-finance/rpc-providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { Bytes, Contract, ContractFunction, providers, utils } from "ethers";
import { describe, test } from "mocha";
import {
  readClassicManifests,
  readMultiFeedManifests,
} from "../../scripts/read-manifests";

const ABI = ["function getDataFeedId() public view returns (bytes32)"];

const CONNECTION_INFO = {
  throttleLimit: 1,
  timeout: 5_000,
};

export const RETRY_CONFIG = {
  maxRetries: 3,
  waitBetweenMs: 1000,
  disableLog: true,
};

const getProvider = (chainId: number): providers.Provider => {
  const { publicRpcUrls, name } = getChainConfigByChainId(chainId);
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
  const dataFeedIdFromContractAsBytes = await RedstoneCommon.retry({
    fn: () => (contract.getDataFeedId as ContractFunction<Bytes>)(),
    ...RETRY_CONFIG,
  })();
  const dataFeedIdFromContract = utils.parseBytes32String(
    dataFeedIdFromContractAsBytes
  );
  return dataFeedId === dataFeedIdFromContract;
};

describe("Price feed contract should return the same dataFeedId as in relayer manifest", () => {
  const classicManifests = readClassicManifests();
  for (const [name, manifest] of Object.entries(classicManifests)) {
    test(name, async () => {
      for (const [dataFeedId, priceFeedAddress] of Object.entries(
        manifest.priceFeeds
      )) {
        if (priceFeedAddress !== "__NO_FEED__") {
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

  const mutliFeedManifests = readMultiFeedManifests();
  for (const [name, manifest] of Object.entries(mutliFeedManifests)) {
    test(name, async () => {
      for (const [dataFeedId, { priceFeedAddress }] of Object.entries(
        manifest.priceFeeds
      )) {
        if (priceFeedAddress) {
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

import { Tx } from "@redstone-finance/utils";
import { ethers } from "hardhat";
import {
  checkDataValues,
  deployMultiFeedAdapterWithoutRoundsMock,
  deployPriceFeedsAdapterWithoutRoundsMock,
  performWritePricesTests,
  RedstoneEvmContract,
} from "../../src";
import {
  BTC_PRICE,
  btcDataFeed,
  ContractParamsProviderMock,
  ContractParamsProviderMockMulti,
  ETH_PRICE,
  ethDataFeed,
} from "./params-provider-mock";

const defaultFeedEntries = [
  { feedId: btcDataFeed, price: BTC_PRICE },
  { feedId: ethDataFeed, price: ETH_PRICE },
];

const txDeliveryManCreator = (adapterContract: RedstoneEvmContract): Tx.ITxDeliveryMan => ({
  deliver: async (txDeliveryCall) => {
    const tx = await adapterContract.signer.sendTransaction({
      to: txDeliveryCall.to,
      data: txDeliveryCall.data,
    });
    await tx.wait();
  },
});

describe("write-prices", () => {
  const provider = ethers.provider;

  it("should update price in multi-feed adapter", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "multi-feed" },
      deployMultiFeedAdapterWithoutRoundsMock,
      txDeliveryManCreator,
      new ContractParamsProviderMock()
    );

    await checkDataValues(adapterContract, defaultFeedEntries);
  });

  it("should update price in multi-feed adapter with multi-point-package", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "multi-feed" },
      deployMultiFeedAdapterWithoutRoundsMock,
      txDeliveryManCreator,
      new ContractParamsProviderMockMulti()
    );

    await checkDataValues(adapterContract, defaultFeedEntries);
  });

  it("should update price in price-feeds adapter", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "price-feeds" },
      deployPriceFeedsAdapterWithoutRoundsMock,
      txDeliveryManCreator,
      new ContractParamsProviderMock()
    );

    await checkDataValues(adapterContract, [{ feedId: btcDataFeed, price: BTC_PRICE }]);
  });
});

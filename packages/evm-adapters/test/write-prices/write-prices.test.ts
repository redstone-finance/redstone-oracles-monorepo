import { Wallet } from "@ethersproject/wallet";
import { Tx } from "@redstone-finance/utils";
import { ethers } from "hardhat";
import {
  checkDataValues,
  deployMultiFeedAdapterWithoutRoundsMock,
  deployPriceFeedsAdapterWithoutRoundsMock,
  performWritePricesTests,
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

const txDeliveryManCreator = (signer: Wallet): Tx.ITxDeliveryMan => ({
  deliver: async (txDeliveryCall) => {
    const tx = await signer.sendTransaction({
      to: txDeliveryCall.to,
      data: txDeliveryCall.data,
    });
    await tx.wait();
  },
});

for (const isV6Contract of [false, true]) {
  describe(`write-prices (${isV6Contract ? "v6" : "v5"})`, () => {
    const provider = ethers.provider;

    it("should update price in multi-feed adapter", async () => {
      const adapterContract = await performWritePricesTests(
        provider,
        { adapterContractType: "multi-feed", isV6Contract },
        deployMultiFeedAdapterWithoutRoundsMock,
        txDeliveryManCreator,
        new ContractParamsProviderMock()
      );

      await checkDataValues(adapterContract, defaultFeedEntries);
    });

    it("should update price in multi-feed adapter with multi-point-package", async () => {
      const adapterContract = await performWritePricesTests(
        provider,
        { adapterContractType: "multi-feed", isV6Contract },
        deployMultiFeedAdapterWithoutRoundsMock,
        txDeliveryManCreator,
        new ContractParamsProviderMockMulti()
      );

      await checkDataValues(adapterContract, defaultFeedEntries);
    });

    it("should update price in price-feeds adapter", async () => {
      const adapterContract = await performWritePricesTests(
        provider,
        { adapterContractType: "price-feeds", isV6Contract },
        deployPriceFeedsAdapterWithoutRoundsMock,
        txDeliveryManCreator,
        new ContractParamsProviderMock()
      );

      await checkDataValues(adapterContract, [{ feedId: btcDataFeed, price: BTC_PRICE }]);
    });
  });
}

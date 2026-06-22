import { JsonRpcProvider } from "@ethersproject/providers";
import {
  checkDataValues,
  deployMultiFeedAdapterWithoutRoundsMock,
  deployPriceFeedsAdapterWithoutRoundsMock,
  performWritePricesTests,
} from "@redstone-finance/evm-adapters";
import { ProviderWithAgreement } from "@redstone-finance/rpc-providers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import { getTxDeliveryMan } from "../../src/core/TxDeliveryManSingleton";
import {
  BTC_PRICE,
  btcDataFeed,
  ContractParamsProviderMock,
  ContractParamsProviderMockMulti,
  ETH_PRICE,
  ethDataFeed,
  mockConfig,
} from "../helpers";
import { server } from "./mock-server";

chai.use(chaiAsPromised);

const defaultFeedEntries = [
  { feedId: btcDataFeed, price: BTC_PRICE },
  { feedId: ethDataFeed, price: ETH_PRICE },
];
describe("write-prices", () => {
  const provider = new ProviderWithAgreement([ethers.provider, ethers.provider]);

  afterEach(() => {
    server.resetHandlers();
  });

  it("should update price in multi-feed adapter", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "multi-feed" },
      deployMultiFeedAdapterWithoutRoundsMock,
      (adapterContract) =>
        getTxDeliveryMan(
          mockConfig(),
          adapterContract.signer,
          adapterContract.provider as JsonRpcProvider
        ),
      new ContractParamsProviderMock()
    );

    await checkDataValues(adapterContract, defaultFeedEntries);
  });

  it("should update price in multi-feed adapter with multi-point-package", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "multi-feed" },
      deployMultiFeedAdapterWithoutRoundsMock,
      (adapterContract) =>
        getTxDeliveryMan(
          mockConfig(),
          adapterContract.signer,
          adapterContract.provider as JsonRpcProvider
        ),
      new ContractParamsProviderMockMulti()
    );

    await checkDataValues(adapterContract, defaultFeedEntries);
  });

  it("should update price in price-feeds adapter", async () => {
    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "price-feeds" },
      deployPriceFeedsAdapterWithoutRoundsMock,
      (adapterContract) =>
        getTxDeliveryMan(
          mockConfig(),
          adapterContract.signer,
          adapterContract.provider as JsonRpcProvider
        ),
      new ContractParamsProviderMock()
    );

    // to price-feeds are written only the feedIds available in contract
    await checkDataValues(adapterContract, [{ feedId: btcDataFeed, price: BTC_PRICE }]);
  });
});

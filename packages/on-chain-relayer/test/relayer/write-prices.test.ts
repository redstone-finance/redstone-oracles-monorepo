import { JsonRpcProvider } from "@ethersproject/providers";
import {
  checkDataValues,
  deployMentoAdapterWithSortedOraclesMock,
  deployMultiFeedAdapterWithoutRoundsMock,
  deployPriceFeedsAdapterWithoutRoundsMock,
  ISortedOracles,
  performWritePricesTests,
} from "@redstone-finance/evm-adapters";
import { ProviderWithAgreement } from "@redstone-finance/rpc-providers";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { parseUnits } from "ethers/lib/utils";
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

const mockToken1Address = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // BTC token address
const mockToken2Address = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // ETH token address

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

  it("should update prices in mento adapter", async () => {
    let sortedOracles: ISortedOracles;

    const adapterContract = await performWritePricesTests(
      provider,
      { adapterContractType: "mento" },
      async (signer) => {
        const { sortedOracles: sortedOraclesTmp, mentoAdapter } =
          await deployMentoAdapterWithSortedOraclesMock(signer);
        sortedOracles = sortedOraclesTmp;

        return await Promise.resolve(mentoAdapter);
      },
      (adapterContract) =>
        getTxDeliveryMan(
          mockConfig({ mentoMaxDeviationAllowed: 1 }),
          adapterContract.signer,
          adapterContract.provider as JsonRpcProvider
        ),

      new ContractParamsProviderMock()
    );

    await checkDataValues(adapterContract, defaultFeedEntries);

    // Check updated values in SortedOracles
    const normalizeValue = (num: number) => parseUnits(num.toString(), 24);
    const expectOracleValues = async (tokenAddress: string, expectedValues: number[]) => {
      const [, oracleValues] = await sortedOracles.getRates(tokenAddress, {
        blockTag: await provider.getBlockNumber(),
      });
      const expectedValuesNormalized = expectedValues.map(normalizeValue);
      expect(oracleValues).to.eql(expectedValuesNormalized);
    };
    await expectOracleValues(mockToken1Address, [BTC_PRICE]);
    await expectOracleValues(mockToken2Address, [ETH_PRICE]);
  });
});

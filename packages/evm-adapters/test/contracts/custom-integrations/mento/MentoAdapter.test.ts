import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SimpleNumericMockWrapper, WrapperBuilder } from "@redstone-finance/evm-connector";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { parseUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import {
  deployMockSortedOracles,
  prepareLinkedListLocationsForMentoAdapterReport,
} from "../../../../src";
import { MentoAdapterBase, MentoAdapterMock, MockSortedOracles } from "../../../../typechain-types";

chai.use(chaiAsPromised);

interface LocationInSortedLinkedListStruct {
  lesserKey: string;
  greaterKey: string;
}

type LocationsModifierFn = (
  locationsBefore: LocationInSortedLinkedListStruct[]
) => LocationInSortedLinkedListStruct[];

describe("MentoAdapter", () => {
  let sortedOracles: MockSortedOracles;

  const mockToken1Address = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // CELO token address
  const mockToken2Address = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // cUSD token address

  const normalizeValue = (num: number) => parseUnits(num.toString(), 24);

  const reportWithAdapter = async (
    mockToken1Value: number,
    mockToken2Value: number,
    adapterToTest: MentoAdapterBase,
    locationsModifierFn: LocationsModifierFn = (l) => l,
    maxAllowedDeviation = Number.MAX_SAFE_INTEGER
  ) => {
    // Wrapping contract
    const dataPoints = [
      { dataFeedId: "BTC", value: mockToken1Value },
      { dataFeedId: "ETH", value: mockToken2Value },
    ];
    const blockTimestamp = await time.latest();
    const timestampMilliseconds = blockTimestamp * 1000;
    await time.setNextBlockTimestamp(blockTimestamp + 10);
    const wrapContract = (contract: MentoAdapterBase) =>
      WrapperBuilder.wrap(contract).usingSimpleNumericMock({
        mockSignersCount: 10,
        dataPoints,
        timestampMilliseconds,
      });
    const dataPackagesWrapper = new SimpleNumericMockWrapper<MentoAdapterBase>({
      mockSignersCount: 10,
      dataPoints,
      timestampMilliseconds,
    });

    // Prepare arguments
    const proposedTimestamp = timestampMilliseconds;
    const locationsInSortedLinkedLists = await prepareLinkedListLocationsForMentoAdapterReport(
      {
        mentoAdapter: adapterToTest,
        dataPackagesWrapper,
        sortedOracles,
      },
      await adapterToTest.provider.getBlockNumber(),
      maxAllowedDeviation
    );

    if (!locationsInSortedLinkedLists) {
      return;
    } // Updating oracle values
    await wrapContract(adapterToTest).updatePriceValues(
      proposedTimestamp,
      locationsModifierFn(locationsInSortedLinkedLists)
    );

    return {
      proposedTimestamp,
      timestampMilliseconds: 1000 * (await time.latest()),
    };
  };

  const expectOracleValues = async (tokenAddress: string, expectedValues: number[]) => {
    const [, oracleValues] = await sortedOracles.getRates(tokenAddress);
    const expectedValuesNormalized = expectedValues.map(normalizeValue);
    expect(oracleValues).to.eql(expectedValuesNormalized);
  };

  const checkCommonFunctionsForMentoAdapter = async (
    adapter: MentoAdapterBase,
    sortedOraclesAddress: string
  ) => {
    const sortedOracles = await adapter.getSortedOracles();
    expect(sortedOracles).to.eq(sortedOraclesAddress);

    const normalizedValue = await adapter.normalizeRedstoneValueForMento(42);
    expect(normalizedValue.div("1" + "0".repeat(16)).toNumber()).to.eq(42);

    await reportWithAdapter(42, 1200, adapter);
    await expectOracleValues(mockToken1Address, [42]);
    await expectOracleValues(mockToken2Address, [1200]);
  };

  beforeEach(async () => {
    // Deploying sorted oracles
    sortedOracles = await deployMockSortedOracles((await ethers.getSigners())[0]);
  });

  it("Should properly upgrade mento adapter contract", async () => {
    const MentoAdapterFactory = await ethers.getContractFactory("MentoAdapterMock");
    const mentoAdapterV1 = (await upgrades.deployProxy(MentoAdapterFactory)) as MentoAdapterMock;
    await mentoAdapterV1.setSortedOraclesAddress(sortedOracles.address);
    const contractAddress = mentoAdapterV1.address;

    // Check contract before upgrade
    const dataFeedsCountBeforeUpgrade = await mentoAdapterV1.getDataFeedsCount();
    expect(dataFeedsCountBeforeUpgrade.toNumber()).to.eql(2);
    await checkCommonFunctionsForMentoAdapter(mentoAdapterV1, sortedOracles.address);

    // Upgrading the contract
    const MentoAdapterMockV2Factory = await ethers.getContractFactory("MentoAdapterMockV2");
    await upgrades.upgradeProxy(mentoAdapterV1, MentoAdapterMockV2Factory);

    // Check contract after upgrade
    const mentoAdapterV2 = await ethers.getContractAt("MentoAdapterMock", contractAddress);
    await mentoAdapterV2.setSortedOraclesAddress(sortedOracles.address);
    const dataFeedsCountAfterUpgrade = await mentoAdapterV2.getDataFeedsCount();
    expect(dataFeedsCountAfterUpgrade.toNumber()).to.eql(1);
    await checkCommonFunctionsForMentoAdapter(mentoAdapterV2, sortedOracles.address);
  });
});

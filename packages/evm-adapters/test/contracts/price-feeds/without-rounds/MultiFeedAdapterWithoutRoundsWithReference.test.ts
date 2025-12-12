import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { WrapperBuilder, type MockSignerAddress } from "@redstone-finance/evm-connector";
import { DataPackage, DataPoint, utils } from "@redstone-finance/protocol";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { formatBytes32String } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  FastMultiFeedAdapterMock,
  MultiFeedAdapterWithoutRounds,
  MultiFeedAdapterWithoutRoundsMockWithReturnOverride,
  MultiFeedAdapterWithoutRoundsTransformingProxyMock,
  MultiFeedAdapterWithoutRoundsWithReferenceMock,
  PriceFeedWithoutRoundsForMultiFeedAdapterMock,
} from "../../../../typechain-types";
import { DATA_FEED_ID, updateByAllNodesFresh } from "../fast-node/fast-node-test-helpers";

type AdapterType = "main" | "ref";

interface DeviationTestCase {
  main: string;
  ref: string;
  expected: AdapterType;
}

chai.use(chaiAsPromised);

const ETH_ID_B32 = formatBytes32String("ETH");
const authorisedSignersForTests: MockSignerAddress[] = [
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
];

const deployContract = async <T>(contractName: string): Promise<T> => {
  const contractFactory = await ethers.getContractFactory(contractName);
  const contract = await contractFactory.deploy();
  await contract.deployed();
  return contract as T;
};

describe("MultiFeedAdapterWithoutRoundsWithReference", () => {
  let adapterWithReference: MultiFeedAdapterWithoutRoundsWithReferenceMock;
  let mainAdapter: MultiFeedAdapterWithoutRounds;
  let refAdapter: MultiFeedAdapterWithoutRounds;
  let priceFeed: PriceFeedWithoutRoundsForMultiFeedAdapterMock;
  let fastAdapter: FastMultiFeedAdapterMock;
  let defaultDataTimestamp: number;

  const updatePrices = async (
    prices: Record<string, string>,
    adapter: MultiFeedAdapterWithoutRounds,
    dataTimestampMs: number
  ) => {
    const prevBlockTime = await time.latest();
    const curBlockTime = prevBlockTime + 1;
    await time.setNextBlockTimestamp(curBlockTime);

    const dataPoints = Object.entries(prices).map(([dataFeedId, value]) => {
      return new DataPoint(dataFeedId, utils.convertNumberToBytes(value, 0, 32));
    });
    const dataPackage = new DataPackage(dataPoints, dataTimestampMs, "__MOCK__");
    const wrappedAdapter = WrapperBuilder.wrap(adapter).usingMockDataPackages(
      authorisedSignersForTests.map((signer) => ({
        signer,
        dataPackage,
      }))
    );

    const dataFeedIds = Object.keys(prices).map(formatBytes32String);

    return await wrappedAdapter.updateDataFeedsValuesPartial(dataFeedIds);
  };

  const connectNewAdapter = async <T>(contractName: string, adapterType: AdapterType) => {
    const newAdapter: MultiFeedAdapterWithoutRounds = await deployContract(contractName);
    const currentMainAdapter = await adapterWithReference.getMainAdapter();
    const currentRefAdapter = await adapterWithReference.getReferenceAdapter();
    const adapterWithRefInitTx = await adapterWithReference.init(
      adapterType === "main" ? newAdapter.address : currentMainAdapter,
      adapterType === "ref" ? newAdapter.address : currentRefAdapter
    );
    await adapterWithRefInitTx.wait();
    return newAdapter as T;
  };

  const expectPrice = async (expectedValue: string) => {
    const valueFromContract = await priceFeed.latestAnswer();
    expect(valueFromContract.toString()).to.eq(expectedValue);
  };

  const beforeEachLogic = async (adapterWithRefContractName: string) => {
    mainAdapter = await deployContract("MultiFeedAdapterWithoutRoundsMock");
    refAdapter = await deployContract("MultiFeedAdapterWithoutRoundsMock");
    adapterWithReference = await deployContract(adapterWithRefContractName);

    // Configure adapterWithReference
    const adapterWithRefInitTx = await adapterWithReference.init(
      mainAdapter.address,
      refAdapter.address
    );
    await adapterWithRefInitTx.wait();

    // Deploy one price feed
    priceFeed = await deployContract("ETHPriceFeedWithoutRoundsForMultiFeedAdapterMock");
    const priceFeedInitTx = await priceFeed.setAdapterAddress(adapterWithReference.address);
    await priceFeedInitTx.wait();

    // Reset defaultDataTimestamp
    defaultDataTimestamp = (await time.latest()) * 1000;
  };

  beforeEach(async () => {
    await beforeEachLogic("MultiFeedAdapterWithoutRoundsWithReferenceMock");
  });

  it("Non-implemented functions should revert", async () => {
    await expect(
      adapterWithReference.getDataTimestampFromLatestUpdate(ETH_ID_B32)
    ).to.be.revertedWithCustomError(adapterWithReference, "UnsupportedFunctionCall");
    await expect(
      adapterWithReference.getBlockTimestampFromLatestUpdate(ETH_ID_B32)
    ).to.be.revertedWithCustomError(adapterWithReference, "UnsupportedFunctionCall");
    await expect(
      adapterWithReference.getLastUpdateDetailsUnsafe(ETH_ID_B32)
    ).to.be.revertedWithCustomError(adapterWithReference, "UnsupportedFunctionCall");
    await expect(
      adapterWithReference.getValuesForDataFeeds([ETH_ID_B32])
    ).to.be.revertedWithCustomError(adapterWithReference, "UnsupportedFunctionCall");
    await expect(
      adapterWithReference.updateDataFeedsValuesPartial([ETH_ID_B32])
    ).to.be.revertedWithCustomError(adapterWithReference, "UnsupportedFunctionCall");
  });

  it("Should revert if both adapters revert", async () => {
    await expect(priceFeed.latestAnswer()).to.be.revertedWithCustomError(
      adapterWithReference,
      "BothAdaptersFailed"
    );
    await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(
      adapterWithReference,
      "BothAdaptersFailed"
    );
    await expect(
      adapterWithReference.getLastUpdateDetails(ETH_ID_B32)
    ).to.be.revertedWithCustomError(adapterWithReference, "BothAdaptersFailed");
    expect(await priceFeed.latestRound()).to.eq(1);
  });

  it("Should use freshest data (main is fresher)", async () => {
    await updatePrices({ ETH: "403" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "402" }, mainAdapter, defaultDataTimestamp + 1);
    await expectPrice("402");
  });

  it("Should use freshest data (ref is fresher)", async () => {
    await updatePrices({ ETH: "403" }, refAdapter, defaultDataTimestamp + 1);
    await updatePrices({ ETH: "402" }, mainAdapter, defaultDataTimestamp);
    await expectPrice("403");
  });

  it("Should use ref data in case of crossed deviation (ref is fresh)", async () => {
    await updatePrices({ ETH: "410" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "402" }, mainAdapter, defaultDataTimestamp + 1);
    await expectPrice("410"); // ref is used even though the main data is fresher
  });

  it("Should use main data in case of crossed deviation (ref is not fresh)", async () => {
    await updatePrices({ ETH: "410" }, refAdapter, defaultDataTimestamp);
    await time.setNextBlockTimestamp((await time.latest()) + 11);
    await mine();
    await updatePrices({ ETH: "402" }, mainAdapter, defaultDataTimestamp + 1);
    await expectPrice("402"); // main is used, because ref data is not fresh
  });

  it("Should use main by default (if data is equally fresh)", async () => {
    await updatePrices({ ETH: "403" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "402" }, mainAdapter, defaultDataTimestamp);
    await expectPrice("402");
  });

  it("Should use ref data if main adapter reverted", async () => {
    await updatePrices({ ETH: "42" }, refAdapter, defaultDataTimestamp);
    await expectPrice("42");
  });

  it("Should use main data if ref adapter reverted", async () => {
    await updatePrices({ ETH: "43" }, mainAdapter, defaultDataTimestamp);
    await expectPrice("43");
  });

  it("Should use ref data if main adapter has timestamp from future", async () => {
    const customTimestampAdapter: MultiFeedAdapterWithoutRoundsMockWithReturnOverride =
      await connectNewAdapter("MultiFeedAdapterWithoutRoundsMockWithReturnOverride", "main");
    await updatePrices({ ETH: "402" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "403" }, customTimestampAdapter, defaultDataTimestamp + 1);
    await expectPrice("403"); // Because data from main is fresher
    await customTimestampAdapter.setBlockTimestampToReturn((await time.latest()) + 100);
    await expectPrice("402"); // Because timestamp is from future
  });

  it("Should use main data if ref adapter has timestamp from future", async () => {
    const customTimestampAdapter: MultiFeedAdapterWithoutRoundsMockWithReturnOverride =
      await connectNewAdapter("MultiFeedAdapterWithoutRoundsMockWithReturnOverride", "ref");
    await updatePrices({ ETH: "42" }, mainAdapter, defaultDataTimestamp + 1);
    await updatePrices({ ETH: "43" }, customTimestampAdapter, defaultDataTimestamp);
    await expectPrice("43"); // Because of deviation
    await customTimestampAdapter.setBlockTimestampToReturn((await time.latest()) + 100);
    await expectPrice("42"); // Because timestamp is from future
  });

  it("Should use ref data if main adapter returns zero value", async () => {
    const customValueAdapter: MultiFeedAdapterWithoutRoundsMockWithReturnOverride =
      await connectNewAdapter("MultiFeedAdapterWithoutRoundsMockWithReturnOverride", "main");
    await updatePrices({ ETH: "402" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "403" }, customValueAdapter, defaultDataTimestamp + 1);
    await expectPrice("403"); // Because data from main is fresher
    await customValueAdapter.setLastValueToReturn(0);
    await expectPrice("402"); // Because main value is invalid (zero)
  });

  it("Should use main data if ref adapter returns zero value", async () => {
    const customValueAdapter: MultiFeedAdapterWithoutRoundsMockWithReturnOverride =
      await connectNewAdapter("MultiFeedAdapterWithoutRoundsMockWithReturnOverride", "ref");
    await updatePrices({ ETH: "42" }, mainAdapter, defaultDataTimestamp + 1);
    await updatePrices({ ETH: "43" }, customValueAdapter, defaultDataTimestamp);
    await expectPrice("43"); // Because ref is deviated from main
    await customValueAdapter.setLastValueToReturn(0);
    await expectPrice("42"); // Because ref value is invalid (zero)
  });

  it("Should query last update details using getLastUpdateDetailsUnsafeForMany", async () => {
    await updatePrices({ ETH: "402", BTC: "4200" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "403" }, mainAdapter, defaultDataTimestamp + 1);
    const dataFeedIds = ["ETH", "BTC"].map(formatBytes32String);
    const lastUpdateDetails =
      await adapterWithReference.getLastUpdateDetailsUnsafeForMany(dataFeedIds);
    expect(lastUpdateDetails[0].value.toString()).to.eq("403"); // Used from main, because it's newer
    expect(lastUpdateDetails[1].value.toString()).to.eq("4200"); // Used from ref, because main doesn't have it
  });

  it("Should use ref data if main adapter tried to consume too much gas", async () => {
    const gasConsumingAdapter: MultiFeedAdapterWithoutRounds = await connectNewAdapter(
      "MultiFeedAdapterWithoutRoundsMockGasConsuming",
      "main"
    );
    await updatePrices({ ETH: "402" }, refAdapter, defaultDataTimestamp);
    await updatePrices({ ETH: "403" }, gasConsumingAdapter, defaultDataTimestamp + 1);
    expect((await gasConsumingAdapter.getLastUpdateDetails(ETH_ID_B32)).lastValue).to.eq("403");
    await expectPrice("402"); // main will hit gas limit
    expect(await priceFeed.latestAnswer({ gasLimit: 40_000_000 })).to.eq("403"); // will not hit with custom gas limit
  });

  it("Should use main data if ref adapter tried to consume too much gas", async () => {
    const gasConsumingAdapter: MultiFeedAdapterWithoutRounds = await connectNewAdapter(
      "MultiFeedAdapterWithoutRoundsMockGasConsuming",
      "ref"
    );
    await updatePrices({ ETH: "42" }, gasConsumingAdapter, defaultDataTimestamp);
    expect((await gasConsumingAdapter.getLastUpdateDetails(ETH_ID_B32)).lastValue).to.eq("42");
    await updatePrices({ ETH: "43" }, mainAdapter, defaultDataTimestamp);
    await expectPrice("43"); // ref will hit gas limit
    expect(await priceFeed.latestAnswer({ gasLimit: 40_000_000 })).to.eq("42"); // will not hit with custom gas limit
  });

  describe("Deviation tests", () => {
    const cases: DeviationTestCase[] = [
      // === Equal & trivial (non-zero) ===
      { main: "1", ref: "1", expected: "main" },
      { main: "100", ref: "100", expected: "main" },
      { main: "10000", ref: "10000", expected: "main" },

      // === Tiny numbers (no zeros) & big deviations sanity ===
      { main: "2", ref: "1", expected: "ref" }, // 5000 bps
      { main: "3", ref: "2", expected: "ref" }, // 3333 bps
      { main: "101", ref: "100", expected: "main" }, // 99 bps
      { main: "102", ref: "100", expected: "ref" }, // 196 bps

      // === Near-threshold (ref LOWER than main) — around 1% down ===
      { main: "10000", ref: "9995", expected: "main" }, // 5 bps
      { main: "10000", ref: "9901", expected: "main" }, // 99 bps
      { main: "10000", ref: "9900", expected: "main" }, // 100 bps
      { main: "10000", ref: "9899", expected: "ref" }, // 101 bps
      // 100k boundary carefully chosen (truncation considered)
      { main: "100000", ref: "99900", expected: "main" }, // 10 bps
      { main: "100000", ref: "98998", expected: "main" }, // 100 bps
      { main: "100000", ref: "98991", expected: "main" }, // 100 bps
      { main: "100000", ref: "98990", expected: "ref" }, // 101 bps

      // === Near-threshold (ref HIGHER than main) — around 1% up ===
      { main: "10000", ref: "10005", expected: "main" }, // 49 bps
      { main: "10000", ref: "10101", expected: "main" }, // 99 bps
      { main: "10000", ref: "10103", expected: "ref" }, // 101 bps
      { main: "50000", ref: "50505", expected: "main" }, // 99 bps
      { main: "50000", ref: "50560", expected: "ref" }, // 110 bps

      // === Sub-percent coverage (both directions) ===
      { main: "10000", ref: "9990", expected: "main" }, // 10 bps
      { main: "10000", ref: "9999", expected: "main" }, // 1 bps
      { main: "10000", ref: "10001", expected: "main" }, // 0 bps (trunc)
      { main: "10000000", ref: "9990000", expected: "main" }, // 10 bps

      // === Multi-percent deviations (down & up) ===
      { main: "10000", ref: "9800", expected: "ref" }, // 200 bps
      { main: "10000", ref: "9500", expected: "ref" }, // 500 bps
      { main: "10000", ref: "9000", expected: "ref" }, // 1000 bps
      { main: "10000", ref: "5000", expected: "ref" }, // 5000 bps
      { main: "10000", ref: "10250", expected: "ref" }, // 243 bps
      { main: "10000", ref: "11000", expected: "ref" }, // 909 bps

      // === Medium values (~1e3) around threshold ===
      { main: "1000", ref: "995", expected: "main" }, // 50 bps
      { main: "1000", ref: "990", expected: "main" }, // 100 bps
      { main: "1000", ref: "989", expected: "ref" }, // 101 bps
      { main: "1000", ref: "1005", expected: "main" }, // 49 bps
      { main: "1000", ref: "1011", expected: "ref" }, // 108 bps

      // === Larger values (1e6–1e9) mixed cases (truncation-safe) ===
      { main: "1000000", ref: "999000", expected: "main" }, // 10 bps
      { main: "1000000", ref: "989000", expected: "ref" }, // 110 bps
      { main: "250000000", ref: "247500000", expected: "main" }, // 100 bps
      { main: "250000000", ref: "247000000", expected: "ref" }, // 120 bps
      { main: "250000000", ref: "252600000", expected: "ref" }, // 102 bps

      // === Very large (1e21) — close & >1% (correct boundaries) ===
      { main: "1000000000000000000000", ref: "999500000000000000000", expected: "main" }, // 50 bps
      { main: "1000000000000000000000", ref: "999000000000000000000", expected: "main" }, // 100 bps
      { main: "1000000000000000000000", ref: "989000000000000000000", expected: "ref" }, // 110 bps
      { main: "1000000000000000000000", ref: "1005000000000000000000", expected: "main" }, // 49 bps
      { main: "1000000000000000000000", ref: "1010300000000000000000", expected: "ref" }, // 101 bps

      // === Asymmetric magnitudes (stress /maxVal path, no zeros) ===
      { main: "1000000000", ref: "1", expected: "ref" }, // 9999 bps
      { main: "1", ref: "1000000000", expected: "ref" }, // 9999 bps
      { main: "123456789", ref: "122222222", expected: "main" }, // 99 bps
      { main: "123456789", ref: "121000000", expected: "ref" }, // 198 bps

      // === Close-to-threshold with integer-division quirks ===
      { main: "7777777", ref: "7700000", expected: "main" }, // 99 bps
      { main: "7777777", ref: "7699000", expected: "ref" }, // 101 bps

      // === Larger upward moves with clean margins (corrected) ===
      { main: "5000000", ref: "5051000", expected: "main" }, // 100 bps
      { main: "5000000", ref: "5049000", expected: "main" }, // 97 bps

      // === “Almost equal” at different magnitudes (1% exact vs >1%) ===
      { main: "10", ref: "10", expected: "main" },
      { main: "100", ref: "99", expected: "main" }, // 100 bps
      { main: "100", ref: "98", expected: "ref" }, // 200 bps
      { main: "100000000", ref: "99900000", expected: "main" }, // 10 bps
      { main: "100000000", ref: "98900000", expected: "ref" }, // 110 bps
    ];

    for (const testCase of cases) {
      it("Deviation test: " + JSON.stringify(testCase), async () => {
        await updatePrices({ ETH: testCase.ref }, refAdapter, defaultDataTimestamp);
        await updatePrices({ ETH: testCase.main }, mainAdapter, defaultDataTimestamp);
        await expectPrice(testCase.expected === "main" ? testCase.main : testCase.ref);
      });
    }
  });

  describe("Should work properly with FastMultiFeedAdapter", () => {
    beforeEach(async () => {
      await beforeEachLogic("MultiFeedAdapterWithoutRoundsWithReferenceMicrosecondsMock");
      fastAdapter = await connectNewAdapter("FastMultiFeedAdapterMock", "main");
      const proxyToRef: MultiFeedAdapterWithoutRoundsTransformingProxyMock =
        await connectNewAdapter("MultiFeedAdapterWithoutRoundsTransformingProxyMock", "ref");
      const proxyToRefInitTx = await proxyToRef.init(refAdapter.address);
      await proxyToRefInitTx.wait();
    });

    it("Should return value from ref if there is no value on fast", async () => {
      await updatePrices({ ETH: "42" }, refAdapter, defaultDataTimestamp);
      await expectPrice("42");
    });

    it("Should return value from fast adapter if it's newer and not deviated", async () => {
      await updatePrices({ ETH: "10200000001" }, refAdapter, defaultDataTimestamp);
      await expectPrice("10200000001");
      await updateByAllNodesFresh(fastAdapter, [100, 101, 102, 103, 1000]);
      const fastAnswer = await fastAdapter.getLastUpdateDetails(DATA_FEED_ID);
      expect(fastAnswer.lastValue.toString()).to.eq("10200000000"); // Median value from the fast adapter
      await expectPrice("10200000000");
    });

    it("Should return value from ref adapter if the value crossed the deviation", async () => {
      await updateByAllNodesFresh(fastAdapter, [100, 100, 100, 103, 1000]);
      await updatePrices({ ETH: "10200000001" }, refAdapter, defaultDataTimestamp);
      await expectPrice("10200000001");
      const fastAnswer = await fastAdapter.getLastUpdateDetails(DATA_FEED_ID);
      expect(fastAnswer.lastValue.toString()).to.eq("10000000000"); // Median value from the fast adapter
      await expectPrice("10200000001"); // value from ref on the adapter with reference
    });

    it("Should use value from ref adapter if deviation is crossed but block and data ts are older than from main", async () => {
      await updatePrices({ ETH: "10200000001" }, refAdapter, defaultDataTimestamp);
      await updateByAllNodesFresh(fastAdapter, [100, 100, 100, 103, 1000]);
      await expectPrice("10200000001");
    });

    it("Should use data from main in case of deviation but when ref data is old", async () => {
      await updateByAllNodesFresh(fastAdapter, [100, 100, 100, 103, 1000]);
      const fastAnswer = await fastAdapter.getLastUpdateDetails(DATA_FEED_ID);
      await updatePrices({ ETH: "10200000001" }, refAdapter, defaultDataTimestamp);
      await expectPrice("10200000001");
      expect(fastAnswer.lastValue.toString()).to.eq("10000000000"); // Median value from the fast adapter
      await expectPrice("10200000001"); // value from ref on the adapter with reference

      // Waiting for 11 seconds
      await time.setNextBlockTimestamp((await time.latest()) + 11);
      await mine();

      // Updating only main, ref data is outdated
      await updateByAllNodesFresh(fastAdapter, [100, 101, 104, 105, 1000]);
      await expectPrice("10400000000"); // Value in the ref adapter is too old now
    });

    it("Should use data with the newest data timestamp", async () => {
      // No deviation, main data is newer
      await updateByAllNodesFresh(fastAdapter, [100, 101, 102, 103, 1000]);
      await updatePrices({ ETH: "10200000002" }, refAdapter, (await time.latest()) * 1000 - 1);
      await expectPrice("10200000000"); // Median value from the fast adapter (because it's data a bit newer)

      // No deviation, ref data is newer
      await updatePrices({ ETH: "10200000002" }, refAdapter, (await time.latest()) * 1000 + 1);
      await expectPrice("10200000002"); // Values from the ref adapter (because now it's newer)
    });
  });
});

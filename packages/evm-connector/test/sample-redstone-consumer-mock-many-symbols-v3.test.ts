import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DataPackage,
  INumericDataPoint,
  NumericDataPoint,
} from "redstone-protocol";
import {
  MOCK_SIGNERS,
  MockSignerIndex,
  MockSignerAddress,
  DEFAULT_TIMESTAMP_FOR_TESTS,
} from "../src/helpers/test-utils";
import { WrapperBuilder } from "../src/index";
import { MockDataPackageConfigV2 } from "../src/wrappers/MockWrapperV2";
import { SampleRedstoneConsumerMockManySymbolsV3 } from "../typechain-types";

interface MockPackageOpts {
  mockSignerIndex: MockSignerIndex;
  dataPoints: INumericDataPoint[];
  timestampMilliseconds?: number;
}

function getMockPackage(opts: MockPackageOpts): MockDataPackageConfigV2 {
  const timestampMilliseconds =
    opts.timestampMilliseconds || DEFAULT_TIMESTAMP_FOR_TESTS;
  const dataPoints = opts.dataPoints.map((dp) => new NumericDataPoint(dp));
  return {
    signer: MOCK_SIGNERS[opts.mockSignerIndex].address as MockSignerAddress,
    dataPackage: new DataPackage(dataPoints, timestampMilliseconds),
  };
}

describe("SampleRedstoneConsumerMockManySymbolsV3", function () {
  let contract: SampleRedstoneConsumerMockManySymbolsV3;

  this.beforeEach(async () => {
    const ContractFactory = await ethers.getContractFactory(
      "SampleRedstoneConsumerMockManySymbolsV3"
    );
    contract = await ContractFactory.deploy();
    await contract.deployed();
  });

  it("Should properly execute transaction on RedstoneConsumerBase contract", async () => {
    const wrappedContract = WrapperBuilder.wrap(contract).usingMockDataV2([
      getMockPackage({
        mockSignerIndex: 0,
        dataPoints: [
          { symbol: "BTC", value: 412 },
          { symbol: "ETH", value: 41 },
        ],
      }),
      getMockPackage({
        mockSignerIndex: 1,
        dataPoints: [
          { symbol: "BTC", value: 390 },
          { symbol: "ETH", value: 42 },
        ],
      }),
      getMockPackage({
        mockSignerIndex: 2,
        dataPoints: [
          { symbol: "BTC", value: 400 },
          { symbol: "ETH", value: 43 },
        ],
      }),
    ]);

    const tx = await wrappedContract.saveLatestPricesInStorage();
    await tx.wait();

    const latestEthPriceFromContract = await contract.latestEthPrice();
    const latestBtcPriceFromContract = await contract.latestBtcPrice();
    expect(latestEthPriceFromContract.div(10 ** 8).toNumber()).to.be.equal(42);
    expect(latestBtcPriceFromContract.div(10 ** 8).toNumber()).to.be.equal(400);
  });
});

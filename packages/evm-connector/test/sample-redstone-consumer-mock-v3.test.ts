import { expect } from "chai";
import { ethers } from "hardhat";
import { DataPackage, NumericDataPoint } from "redstone-protocol";
import { convertStringToBytes32 } from "redstone-protocol/dist/src/common/utils";
import {
  MOCK_SIGNERS,
  DEFAULT_TIMESTAMP_FOR_TESTS,
  MockSignerIndex,
  MockSignerAddress,
} from "../src/helpers/test-utils";
import { WrapperBuilder } from "../src/index";
import { MockDataPackageConfigV2 } from "../src/wrappers/MockWrapperV2";
import { SampleRedstoneConsumerMockV3 } from "../typechain-types";

const DEFAULT_SYMBOL = "SOME LONG STRING FOR SYMBOL TO TRIGGER SYMBOL HASHING";
// const DEFAULT_SYMBOL = "ETH";
const DEFAULT_SYMBOL_BYTES_32 = convertStringToBytes32(DEFAULT_SYMBOL);

interface MockPackageOpts {
  mockSignerIndex: MockSignerIndex;
  value: number;
  symbol?: string;
  timestampMilliseconds?: number;
}

const getMockPackage = (opts: MockPackageOpts): MockDataPackageConfigV2 => {
  const timestampMilliseconds =
    opts.timestampMilliseconds || DEFAULT_TIMESTAMP_FOR_TESTS;
  const decimals = 8;
  const valueByteSize = 10;
  const dataPoints = [
    new NumericDataPoint({
      symbol: opts.symbol || DEFAULT_SYMBOL,
      value: opts.value,
      decimals,
      valueByteSize,
    }),
  ];
  return {
    signer: MOCK_SIGNERS[opts.mockSignerIndex].address as MockSignerAddress,
    dataPackage: new DataPackage(dataPoints, timestampMilliseconds),
  };
};

describe("SampleRedstoneConsumerMockV3", function () {
  let contract: SampleRedstoneConsumerMockV3;

  this.beforeEach(async () => {
    const ContractFactory = await ethers.getContractFactory(
      "SampleRedstoneConsumerMockV3"
    );
    contract = await ContractFactory.deploy();
    await contract.deployed();
  });

  it("Should properly execute transaction on RedstoneConsumerBase contract", async () => {
    const wrappedContract = WrapperBuilder.wrap(contract).usingMockDataV2([
      getMockPackage({ mockSignerIndex: 0, value: 41 }),
      getMockPackage({ mockSignerIndex: 1, value: 43 }),
      getMockPackage({ mockSignerIndex: 2, value: 42 }),
    ]);

    const tx = await wrappedContract.saveLatestPriceInStorage(
      DEFAULT_SYMBOL_BYTES_32
    );
    await tx.wait();

    const latestEthPriceFromContract = await contract.latestPrice();
    expect(latestEthPriceFromContract.div(10 ** 8).toNumber()).to.be.equal(42);
  });

  it("Should revert if there are too few signers", async () => {
    const wrappedContract = WrapperBuilder.wrap(contract).usingMockDataV2([
      getMockPackage({ mockSignerIndex: 0, value: 100 }),
      getMockPackage({ mockSignerIndex: 1, value: 100 }),
    ]);

    await expect(
      wrappedContract.saveLatestPriceInStorage(DEFAULT_SYMBOL_BYTES_32)
    ).to.be.revertedWith("Insufficient number of unique signers");
  });

  it("Should revert if there are too few unique signers", async () => {
    const wrappedContract = WrapperBuilder.wrap(contract).usingMockDataV2([
      getMockPackage({ mockSignerIndex: 0, value: 100 }),
      getMockPackage({ mockSignerIndex: 1, value: 100 }),
      getMockPackage({ mockSignerIndex: 1, value: 100 }),
    ]);

    await expect(
      wrappedContract.saveLatestPriceInStorage(DEFAULT_SYMBOL_BYTES_32)
    ).to.be.revertedWith("Insufficient number of unique signers");
  });
});

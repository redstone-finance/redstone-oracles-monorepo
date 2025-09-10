import { utils } from "@redstone-finance/protocol";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import { MOCK_SIGNERS, WrapperBuilder } from "../../src/index";
import { DataServiceWrapper } from "../../src/wrappers/DataServiceWrapper";
import { SampleRedstoneConsumerNumericMockManyDataFeeds } from "../../typechain-types";
import { expectedNumericValues } from "../tests-common";
import { server } from "./mock-server";

chai.use(chaiAsPromised);

const dataFeedIdsB32 = [utils.convertStringToBytes32("ETH"), utils.convertStringToBytes32("BTC")];

const checkExpectedValues = async (contract: SampleRedstoneConsumerNumericMockManyDataFeeds) => {
  const firstValueFromContract = await contract.firstValue();
  const secondValueFromContract = await contract.secondValue();

  expect(firstValueFromContract.toNumber()).to.be.equal(expectedNumericValues["ETH"]);
  expect(secondValueFromContract.toNumber()).to.be.equal(expectedNumericValues["BTC"]);
};

const runTest = async (
  contract: SampleRedstoneConsumerNumericMockManyDataFeeds,
  urls?: string[],
  dataServiceId?: string,
  uniqueSignersCount?: number,
  authorizedSigners?: string[]
) => {
  const wrappedContract = WrapperBuilder.wrap(contract).usingDataService({
    dataServiceId,
    uniqueSignersCount,
    dataPackagesIds: ["ETH", "BTC"],
    urls,
    authorizedSigners: authorizedSigners ?? MOCK_SIGNERS.map((s) => s.address),
  });

  const tx = await wrappedContract.save2ValuesInStorage(dataFeedIdsB32);
  await tx.wait();

  await checkExpectedValues(contract);
};

const runTestWithManualPayload = async (
  contract: SampleRedstoneConsumerNumericMockManyDataFeeds,
  payload: string
) => {
  const tx = await contract.save2ValuesInStorageWithManualPayload(dataFeedIdsB32, payload);
  await tx.wait();
  await checkExpectedValues(contract);
};

describe("DataServiceWrapper", () => {
  before(() => server.listen());
  afterEach(() => server.resetHandlers());
  after(() => server.close());

  describe("With passed 'dataServiceId'", () => {
    let contract: SampleRedstoneConsumerNumericMockManyDataFeeds;

    beforeEach(async () => {
      const ContractFactory = await ethers.getContractFactory(
        "SampleRedstoneConsumerNumericMockManyDataFeeds"
      );
      contract = await ContractFactory.deploy();
      await contract.deployed();
    });

    it("Should properly execute with one valid cache", async () => {
      await runTest(contract, ["http://valid-cache.com"], "mock-data-service-tests");
    });

    it("Should properly execute with one valid and one invalid cache", async () => {
      await runTest(
        contract,
        ["http://valid-cache.com", "http://invalid-cache.com"],
        "mock-data-service-tests"
      );
    });

    it("Should properly execute with one valid and one slower cache", async () => {
      await runTest(
        contract,
        ["http://slower-cache.com", "http://valid-cache.com"],
        "mock-data-service-tests"
      );
    });

    it("Should get urls from @redstone-finance/protocol if not provided", async () => {
      await runTest(contract, undefined, "mock-data-service-tests");
    });

    it("Should fail if contract doesn't expose getDataServiceId and dataServiceId is not passed", async () => {
      await expect(runTest(contract, undefined, undefined)).rejectedWith();
    });

    it("Should throw error when multiple invalid caches", async () => {
      const expectedErrorMessage = `VM Exception while processing transaction: reverted with custom error 'SignerNotAuthorised("0xE948D1e3cd0f894275A06ED2Dc53eA145B51CFfa")`;
      await expect(
        runTest(
          contract,
          ["http://invalid-cache.com", "http://invalid-cache.com"],
          "mock-data-service-tests",
          1,
          ["0xE948D1e3cd0f894275A06ED2Dc53eA145B51CFfa"]
        )
      ).to.be.rejectedWith(expectedErrorMessage);
    });

    it("Should work with manual payload with all params passed", async () => {
      const wrapper = new DataServiceWrapper({
        dataServiceId: "mock-data-service-tests",
        uniqueSignersCount: 10,
        dataPackagesIds: ["ETH", "BTC"],
        urls: ["http://valid-cache.com"],
        authorizedSigners: MOCK_SIGNERS.map((s) => s.address),
      });
      const payload = await wrapper.getRedstonePayloadForManualUsage(contract);
      await runTestWithManualPayload(contract, payload);
    });
  });

  describe("With RedstoneDataServiceConsumer contract", () => {
    let contract: SampleRedstoneConsumerNumericMockManyDataFeeds;

    beforeEach(async () => {
      const ContractFactory = await ethers.getContractFactory(
        "SampleRedstoneDataServiceConsumerMock"
      );
      contract = await ContractFactory.deploy();
      await contract.deployed();
    });

    it("Should work with passed urls", async () => {
      await runTest(contract, ["http://valid-cache.com"]);
    });

    it("Should work without passed urls", async () => {
      await runTest(contract);
    });

    it("Should throw on not supported data-service id", async () => {
      await expect(runTest(contract, undefined, "wrong-service-id")).rejectedWith(
        "Data service wrong-service-id is not configured by RedStone protocol"
      );
    });

    it("Should work with dataServiceId passed explicit", async () => {
      await runTest(contract, undefined, "mock-data-service-tests");
    });

    it("Should work with dataServiceId and urls passed explicit", async () => {
      await runTest(contract, ["http://valid-cache.com"], "mock-data-service-tests");
    });

    it("Should work with manual payload without passed params", async () => {
      const wrapper = new DataServiceWrapper({
        dataPackagesIds: ["ETH", "BTC"],
        authorizedSigners: MOCK_SIGNERS.map((s) => s.address),
      });
      const payload = await wrapper.getRedstonePayloadForManualUsage(contract);
      await runTestWithManualPayload(contract, payload);
    });
  });
});

import { utils } from "@redstone-finance/protocol";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import hre from "hardhat";
import { DataServiceWrapper, MOCK_SIGNERS, WrapperBuilder } from "../../src/index.js";
import { expectCustomError } from "../assertions.js";
import { deployContract } from "../commons.js";
import {
  SampleRedstoneConsumerNumericMockManyDataFeeds,
  SampleRedstoneDataServiceConsumerMock,
} from "../contract-types.js";
import { expectedNumericValues } from "../tests-common.js";
import { server } from "./mock-server.js";

chai.use(chaiAsPromised);

const dataFeedIdsB32 = [utils.convertStringToBytes32("ETH"), utils.convertStringToBytes32("BTC")];

const checkExpectedValues = async (contract: SampleRedstoneConsumerNumericMockManyDataFeeds) => {
  const firstValueFromContract = await contract.firstValue();
  const secondValueFromContract = await contract.secondValue();

  expect(firstValueFromContract.toNumber()).to.be.equal(expectedNumericValues["ETH"]);
  expect(secondValueFromContract.toNumber()).to.be.equal(expectedNumericValues["BTC"]);
};

const VALID_CACHE_URL = "http://valid-cache.com";
const INVALID_CACHE_URL = "http://invalid-cache.com";
const DEFAULT_GATEWAY_URLS = [VALID_CACHE_URL];
const MOCK_DATA_SERVICE_ID = "mock-data-service-tests";
const UNAUTHORISED_SIGNER_ADDRESS = "0xE948D1e3cd0f894275A06ED2Dc53eA145B51CFfa";
const toAuthenticatedGateways = (urls: string[]) =>
  urls.map((url) => ({ url, apiKey: "test-api-key" }));

const runTest = async (
  contract: SampleRedstoneConsumerNumericMockManyDataFeeds,
  urls: string[] = [],
  dataServiceId?: string,
  uniqueSignersCount?: number,
  authorizedSigners?: string[]
) => {
  const wrappedContract = WrapperBuilder.wrap(contract).usingDataService({
    dataServiceId,
    uniqueSignersCount,
    dataPackagesIds: ["ETH", "BTC"],
    authenticatedGateways: toAuthenticatedGateways(urls),
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
      ({ contract } = await deployContract<SampleRedstoneConsumerNumericMockManyDataFeeds>(
        hre,
        "SampleRedstoneConsumerNumericMockManyDataFeeds"
      ));
    });

    it("Should properly execute with one valid cache", async () => {
      await runTest(contract, [VALID_CACHE_URL], MOCK_DATA_SERVICE_ID);
    });

    it("Should properly execute with one valid and one invalid cache", async () => {
      await runTest(contract, [VALID_CACHE_URL, INVALID_CACHE_URL], MOCK_DATA_SERVICE_ID);
    });

    it("Should properly execute with one valid and one slower cache", async () => {
      await runTest(contract, ["http://slower-cache.com", VALID_CACHE_URL], MOCK_DATA_SERVICE_ID);
    });

    it("Should fail if contract doesn't expose getDataServiceId and dataServiceId is not passed", async () => {
      await expect(runTest(contract, undefined, undefined)).rejectedWith();
    });

    it("Should throw error when multiple invalid caches", async () => {
      await expectCustomError(
        contract,
        "SignerNotAuthorised",
        () =>
          runTest(contract, [INVALID_CACHE_URL, INVALID_CACHE_URL], MOCK_DATA_SERVICE_ID, 1, [
            UNAUTHORISED_SIGNER_ADDRESS,
          ]),
        [UNAUTHORISED_SIGNER_ADDRESS]
      );
    });

    it("Should work with manual payload with all params passed", async () => {
      const wrapper = new DataServiceWrapper({
        dataServiceId: MOCK_DATA_SERVICE_ID,
        uniqueSignersCount: 10,
        dataPackagesIds: ["ETH", "BTC"],
        authenticatedGateways: toAuthenticatedGateways(DEFAULT_GATEWAY_URLS),
        authorizedSigners: MOCK_SIGNERS.map((s) => s.address),
      });
      const payload = await wrapper.getRedstonePayloadForManualUsage(contract);
      await runTestWithManualPayload(contract, payload);
    });
  });

  describe("With RedstoneDataServiceConsumer contract", () => {
    let contract: SampleRedstoneDataServiceConsumerMock;

    beforeEach(async () => {
      ({ contract } = await deployContract<SampleRedstoneDataServiceConsumerMock>(
        hre,
        "SampleRedstoneDataServiceConsumerMock"
      ));
    });

    it("Should work with passed urls", async () => {
      await runTest(contract, [VALID_CACHE_URL]);
    });

    it("Should work with dataServiceId passed explicit", async () => {
      await runTest(contract, DEFAULT_GATEWAY_URLS, MOCK_DATA_SERVICE_ID);
    });

    it("Should work with dataServiceId and urls passed explicit", async () => {
      await runTest(contract, [VALID_CACHE_URL], MOCK_DATA_SERVICE_ID);
    });

    it("Should work with manual payload without passed params", async () => {
      const wrapper = new DataServiceWrapper({
        dataPackagesIds: ["ETH", "BTC"],
        authenticatedGateways: toAuthenticatedGateways(DEFAULT_GATEWAY_URLS),
        authorizedSigners: MOCK_SIGNERS.map((s) => s.address),
      });
      const payload = await wrapper.getRedstonePayloadForManualUsage(contract);
      await runTestWithManualPayload(contract, payload);
    });
  });
});

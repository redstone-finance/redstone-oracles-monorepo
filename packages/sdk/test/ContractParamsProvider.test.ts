import {
  MOCK_FAST_PACKAGE_ID,
  mockFastMediumPackages,
  mockPayload,
  mockSignedDataPackagesResponse,
} from "./mocks/mock-packages";
// Do not remove this empty line to have the mocks working
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  requestDataPackages,
} from "../src";

jest.mock("../src/request-data-packages", () => ({
  ...jest.requireActual<object>("../src/request-data-packages"),
  requestDataPackages: jest.fn().mockResolvedValue(mockSignedDataPackagesResponse),
}));

const RESPONSE_FEED_IDS = Object.keys(mockSignedDataPackagesResponse);
const FEED_ID_OUTSIDE_RESPONSE = "LINK";
const BATCHED_FEED_IDS = [...RESPONSE_FEED_IDS, FEED_ID_OUTSIDE_RESPONSE];
const BATCH_SIZE = RESPONSE_FEED_IDS.length;

describe("ContractParamsProvider tests", () => {
  const mockRequestParams: DataPackagesRequestParams = {
    dataServiceId: "service-1",
    uniqueSignersCount: 2,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: [],
    authenticatedGateways: [{ apiKey: "mock-api-key" }],
  };
  const fastRequestParams: DataPackagesRequestParams = {
    ...mockRequestParams,
    dataPackagesIds: [MOCK_FAST_PACKAGE_ID, ...BATCHED_FEED_IDS],
  };
  let sut: ContractParamsProvider;

  beforeEach(() => {
    sut = new ContractParamsProvider(mockRequestParams);
    jest.clearAllMocks();
  });

  it("should generate payload hex with prefix", async () => {
    const payloadHex = await sut.getPayloadHex(true);
    expect(payloadHex).toBe(`0x${mockPayload}`);
  });

  it("should generate payload hex without prefix", async () => {
    const payloadHex = await sut.getPayloadHex(false);
    expect(payloadHex).toBe(mockPayload);
  });

  it("should convert hex payload to array of numbers", async () => {
    const payloadData = await sut.getPayloadData();
    expect(payloadData).toEqual(Array.from(RedstoneCommon.arrayify(mockPayload)));
  });

  it("should return hexlified feed IDs", () => {
    expect(sut.getHexlifiedFeedIds()).toEqual(["0x455448", "0x425443"]);
    expect(sut.getHexlifiedFeedIdsAsBytes32()).toEqual([
      `0x455448${"00".repeat(29)}`,
      `0x425443${"00".repeat(29)}`,
    ]);
  });

  it("should unhexlify both unpadded and bytes32-padded feed IDs", () => {
    const feedIds = sut.getDataFeedIds();

    expect(
      sut.getHexlifiedFeedIds().map((feedId) => ContractParamsProvider.unhexlifyFeedId(feedId))
    ).toEqual(feedIds);
    expect(
      sut
        .getHexlifiedFeedIdsAsBytes32()
        .map((feedId) => ContractParamsProvider.unhexlifyFeedId(feedId))
    ).toEqual(feedIds);
  });

  it("should return data feed IDs", () => {
    expect(sut.getDataFeedIds()).toEqual(mockRequestParams.dataPackagesIds);

    const overrideIds = ["override1", "override2"];
    sut = new ContractParamsProvider(mockRequestParams, undefined, overrideIds);
    expect(sut.getDataFeedIds()).toEqual(overrideIds);
  });

  it("should split feeds into batches requesting only their own feeds", () => {
    sut = new ContractParamsProvider(fastRequestParams, undefined, BATCHED_FEED_IDS);

    const batches = sut.splitIntoFeedBatches(BATCH_SIZE);

    expect(batches.map((batch) => batch.requestParams.dataPackagesIds)).toEqual([
      RESPONSE_FEED_IDS,
      [FEED_ID_OUTSIDE_RESPONSE],
    ]);
    expect(batches.map((batch) => batch.getDataFeedIds())).toEqual([
      RESPONSE_FEED_IDS,
      [FEED_ID_OUTSIDE_RESPONSE],
    ]);
  });

  it.each([
    ["overridden feeds", BATCHED_FEED_IDS],
    ["feeds from the request", undefined],
  ])(
    "should split %s into batches requesting multi-point packages",
    (_title, overriddenFeedIds) => {
      sut = new ContractParamsProvider(fastRequestParams, undefined, overriddenFeedIds);

      const batches = sut.splitIntoFeedBatches(BATCH_SIZE, true);

      expect(batches.map((batch) => batch.requestParams.dataPackagesIds)).toEqual([
        [MOCK_FAST_PACKAGE_ID, ...RESPONSE_FEED_IDS],
        [MOCK_FAST_PACKAGE_ID, FEED_ID_OUTSIDE_RESPONSE],
      ]);
      expect(batches.map((batch) => batch.getDataFeedIds())).toEqual([
        RESPONSE_FEED_IDS,
        [FEED_ID_OUTSIDE_RESPONSE],
      ]);
    }
  );

  it("should keep a multi-point package instead of single packages of its feeds in a batch", async () => {
    (requestDataPackages as jest.Mock).mockResolvedValueOnce({
      ...mockSignedDataPackagesResponse,
      [MOCK_FAST_PACKAGE_ID]: mockFastMediumPackages,
    });
    sut = new ContractParamsProvider(fastRequestParams, undefined, BATCHED_FEED_IDS);
    const [firstBatch] = sut.splitIntoFeedBatches(BATCH_SIZE, true);

    const result = await firstBatch.requestDataPackages();

    expect(result).toEqual({ [MOCK_FAST_PACKAGE_ID]: mockFastMediumPackages });
  });

  it("should return cached data packages if available", async () => {
    const cache = new DataPackagesResponseCache();
    const newResponse = {
      ...mockSignedDataPackagesResponse,
      XXX: mockSignedDataPackagesResponse["ETH"],
    };
    cache.update(newResponse, mockRequestParams);
    sut = new ContractParamsProvider(
      { ...mockRequestParams, dataPackagesIds: ["ETH", "XXX", "BTC"] },
      cache
    );

    const result = await sut.requestDataPackages();

    expect(result).toBe(newResponse);
    expect(result).not.toBe(mockSignedDataPackagesResponse);
    expect(requestDataPackages).not.toHaveBeenCalled();
  });

  it("should request data packages if not cached", async () => {
    const result = await sut.requestDataPackages();
    expect(requestDataPackages).toHaveBeenCalledWith(mockRequestParams);
    expect(result).toBe(mockSignedDataPackagesResponse);
  });

  it("should process known feeds into payload", async () => {
    const overrideIds = ["ETH", "BTC", "missing0", "missing1"];
    sut = new ContractParamsProvider(mockRequestParams, undefined, overrideIds);

    const expectedMissing = ["missing0", "missing1"];
    const expectedNotMissing = ["ETH", "BTC"];

    const splitPayloads = await sut.prepareSplitPayloads();
    const { payloads, missingFeedIds } = ContractParamsProvider.extractMissingValues(splitPayloads);

    expect(missingFeedIds).toStrictEqual(expectedMissing);
    expect(Object.keys(payloads)).toStrictEqual(expectedNotMissing);
  });

  it("should return expanded data feeds info with normal feeds", async () => {
    const overrideIds = ["ETH", "BTC", "AVAX", "SOL"];
    sut = new ContractParamsProvider(mockRequestParams, undefined, overrideIds);

    const { missingFeeds, feedsFromResponse, dataPackages, requestedFeedIds } =
      await sut.requestDataPackagesWithFeedsInfo();

    expect(feedsFromResponse).toEqual(["ETH", "BTC"]);
    expect(requestedFeedIds).toEqual(["ETH", "BTC", "AVAX", "SOL"]);
    expect(missingFeeds).toEqual(["AVAX", "SOL"]);
    expect(dataPackages).toEqual(mockSignedDataPackagesResponse);
  });

  it("should expand medium packages into feeds", async () => {
    const mediumPackageResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
      __FAST__: mockFastMediumPackages,
    };

    const responseWithoutEthSinglePackage = {
      __FAST__: mockFastMediumPackages,
    };

    (requestDataPackages as jest.Mock).mockResolvedValueOnce(mediumPackageResponse);

    const overrideIds = ["ETH", "__FAST__", "SOL"];
    sut = new ContractParamsProvider(mockRequestParams, undefined, overrideIds);

    const { missingFeeds, feedsFromResponse, dataPackages, requestedFeedIds } =
      await sut.requestDataPackagesWithFeedsInfo();

    expect(feedsFromResponse).toEqual(["ETH"]);
    expect(requestedFeedIds).toEqual(["ETH", "__FAST__", "SOL"]);
    expect(missingFeeds).toEqual(["SOL"]);
    expect(dataPackages).toEqual(responseWithoutEthSinglePackage);
  });

  it("should expand medium packages into feeds", async () => {
    const mediumPackageResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
      __FAST__: [...mockSignedDataPackagesResponse["BTC"]],
    };

    const responseWithoutEthSinglePackage = {
      __FAST__: [...mockSignedDataPackagesResponse["BTC"]],
    };

    (requestDataPackages as jest.Mock).mockResolvedValueOnce(mediumPackageResponse);

    const overrideIds = ["BTC", "__FAST__"];
    sut = new ContractParamsProvider(mockRequestParams, undefined, overrideIds);

    const { missingFeeds, feedsFromResponse, dataPackages, requestedFeedIds } =
      await sut.requestDataPackagesWithFeedsInfo();

    expect(feedsFromResponse).toEqual(["BTC"]);
    expect(requestedFeedIds).toEqual(["BTC", "__FAST__"]);
    expect(missingFeeds).toEqual([]);
    expect(dataPackages).toEqual(responseWithoutEthSinglePackage);
  });
});

import {
  DataPackagesResponse,
  DataPackagesResponseStorage,
  getSignersForDataServiceId,
} from "../src";
import {
  makeMockSignedDataPackage,
  MOCK_TIMESTAMP,
  mockSignedDataPackagesResponse,
} from "./mocks/mock-packages";
import { makeReqParamsFactory } from "./mocks/mock-req-params";

const NOW = MOCK_TIMESTAMP + 1000;

const makeReqParams = makeReqParamsFactory({
  dataServiceId: "redstone-primary-prod",
  dataPackagesIds: ["ETH", "BTC"],
  uniqueSignersCount: 2,
  authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  historicalTimestamp: MOCK_TIMESTAMP,
});

describe("DataPackagesResponseStorage", () => {
  let sut: DataPackagesResponseStorage;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    sut = new DataPackagesResponseStorage();
  });

  afterEach(() => jest.restoreAllMocks());

  it("should return undefined when cache is empty", () => {
    const result = sut.get(makeReqParams());

    expect(result).toBeUndefined();
  });

  it("should return undefined when request is not historical", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());

    const result = sut.get(makeReqParams({ historicalTimestamp: undefined }));

    expect(result).toBeUndefined();
  });

  it("should return undefined when returnAllPackages is true", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());

    const result = sut.get(makeReqParams({ returnAllPackages: true }));

    expect(result).toBeUndefined();
  });

  it("should cache and return response for matching historicalTimestamp", () => {
    const reqParams = makeReqParams();
    sut.set(mockSignedDataPackagesResponse, reqParams);

    const result = sut.get(reqParams);

    expect(result).toEqual(mockSignedDataPackagesResponse);
  });

  it("should return filtered response for subset of dataPackagesIds", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());

    const result = sut.get(makeReqParams({ dataPackagesIds: ["ETH"] }));

    expect(result).toEqual({ ETH: mockSignedDataPackagesResponse["ETH"] });
  });

  it("should return undefined for non-matching historicalTimestamp", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());

    const result = sut.get(makeReqParams({ historicalTimestamp: MOCK_TIMESTAMP + 10000 }));

    expect(result).toBeUndefined();
  });

  it("should extend existing cache entry for same timestamp with different feeds", () => {
    const ethOnly: DataPackagesResponse = { ETH: mockSignedDataPackagesResponse["ETH"] };
    const btcOnly: DataPackagesResponse = { BTC: mockSignedDataPackagesResponse["BTC"] };

    sut.set(ethOnly, makeReqParams({ dataPackagesIds: ["ETH"] }));
    sut.set(btcOnly, makeReqParams({ dataPackagesIds: ["BTC"] }));

    const result = sut.get(makeReqParams({ dataPackagesIds: ["ETH", "BTC"] }));

    expect(result).toEqual(mockSignedDataPackagesResponse);
  });

  it("should purge stale entries based on TTL", () => {
    const shortTtlStorage = new DataPackagesResponseStorage(1000);

    shortTtlStorage.set(mockSignedDataPackagesResponse, makeReqParams());

    jest.spyOn(Date, "now").mockReturnValue(MOCK_TIMESTAMP + 2000);

    const result = shortTtlStorage.get(makeReqParams());

    expect(result).toBeUndefined();
  });

  it("should not purge fresh entries", () => {
    const shortTtlStorage = new DataPackagesResponseStorage(5000);

    shortTtlStorage.set(mockSignedDataPackagesResponse, makeReqParams());

    jest.spyOn(Date, "now").mockReturnValue(MOCK_TIMESTAMP + 3000);

    const result = shortTtlStorage.get(makeReqParams());

    expect(result).toEqual(mockSignedDataPackagesResponse);
  });

  it("should clear all entries", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());
    sut.clear();

    const result = sut.get(makeReqParams());

    expect(result).toBeUndefined();
  });

  it("should store entries per timestamp independently", () => {
    const ts2 = MOCK_TIMESTAMP + 10000;

    const response2: DataPackagesResponse = {
      ETH: [makeMockSignedDataPackage("ETH", 2000, ts2)],
    };

    sut.set(mockSignedDataPackagesResponse, makeReqParams());
    sut.set(response2, makeReqParams({ historicalTimestamp: ts2, dataPackagesIds: ["ETH"] }));

    const result1 = sut.get(makeReqParams());
    const result2 = sut.get(makeReqParams({ historicalTimestamp: ts2, dataPackagesIds: ["ETH"] }));

    expect(result1).toEqual(mockSignedDataPackagesResponse);
    expect(result2).toEqual(response2);
  });

  it("should return undefined for non-conforming request params", () => {
    sut.set(mockSignedDataPackagesResponse, makeReqParams());

    const result = sut.get(makeReqParams({ dataServiceId: "different-service" }));

    expect(result).toBeUndefined();
  });

  it("getInstance should return the same singleton", () => {
    const a = DataPackagesResponseStorage.getInstance();
    const b = DataPackagesResponseStorage.getInstance();

    expect(a).toBe(b);
  });
});

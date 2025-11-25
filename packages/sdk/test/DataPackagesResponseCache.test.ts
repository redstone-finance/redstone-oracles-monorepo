import {
  DataPackagesRequestParams,
  DataPackagesResponseCache,
  getSignersForDataServiceId,
  isConforming,
} from "../src";
import { mockSignedDataPackagesResponse } from "./mocks/mock-packages";

describe("DataPackagesResponseCache tests", () => {
  let sut: DataPackagesResponseCache;
  const mockRequestParams: DataPackagesRequestParams = {
    dataServiceId: "redstone-primary-prod",
    dataPackagesIds: ["ETH", "BTC"],
    uniqueSignersCount: 2,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  };

  beforeEach(() => {
    sut = new DataPackagesResponseCache();
  });

  it("should return undefined when cache is empty", () => {
    const result = sut.get(mockRequestParams);
    expect(sut.isEmpty()).toBeTruthy();

    expect(result).toBeUndefined();
  });

  it("should return cached response when request params match", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);
    const result = sut.get(mockRequestParams);

    expect(result).toEqual(mockSignedDataPackagesResponse);
  });

  it("should return undefined when request params do not conform to cached value", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);
    const differentRequestParams = {
      ...mockRequestParams,
      dataPackagesIds: ["XXX"],
    };

    const result = sut.get(differentRequestParams);
    expect(result).toBeUndefined();
  });

  it("should return cached response filtered by dataPackageIds", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);
    const modifiedRequestParams = {
      ...mockRequestParams,
      dataPackagesIds: ["ETH"],
    };
    const result = sut.get(modifiedRequestParams);

    expect(result).toEqual({ ETH: mockSignedDataPackagesResponse["ETH"] });
  });

  it("should remove cached entry for feedId", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);
    sut.deleteFromResponse("BTC");
    expect(sut.isEmpty()).toBeFalsy();

    const modifiedRequestParams = {
      ...mockRequestParams,
      dataPackagesIds: ["ETH"],
    };
    const result = sut.get(modifiedRequestParams);
    expect(result).toEqual({ ETH: mockSignedDataPackagesResponse["ETH"] });

    sut.deleteFromResponse("ETH");
    expect(sut.isEmpty()).toBeTruthy();

    const result2 = sut.get(modifiedRequestParams);
    expect(result2).toEqual(undefined);
  });

  it("should take from other cache", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);

    const otherSignedDataPackagesResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
    };
    const modifiedRequestParams = {
      ...mockRequestParams,
      dataPackagesIds: ["ETH"],
    };
    const other = new DataPackagesResponseCache(
      otherSignedDataPackagesResponse,
      modifiedRequestParams
    );

    const resSut = sut.takeFromOther(other);
    expect(resSut).toBe(sut);
    expect(sut.isEmpty()).toBeFalsy();

    const result = sut.get(mockRequestParams);
    expect(result).toEqual(undefined);

    const result2 = sut.get(modifiedRequestParams);
    expect(result2).toEqual(otherSignedDataPackagesResponse);
  });

  it("should invalidate when taking from other empty cache", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);
    const resSut = sut.takeFromOther(new DataPackagesResponseCache());
    expect(resSut).toBe(sut);
    expect(sut.isEmpty()).toBeTruthy();
  });

  it("should extend when new feedIds are different than cached ones", () => {
    sut.update({}, mockRequestParams);
    expect(sut.isEmpty()).toBeTruthy();

    const ethSignedDataPackagesResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
    };
    const btcSignedDataPackagesResponse = {
      BTC: mockSignedDataPackagesResponse["BTC"],
    };
    const didExtendEth = sut.maybeExtend(ethSignedDataPackagesResponse, mockRequestParams);
    expect(didExtendEth).toBeTruthy();

    const didExtendBtc = sut.maybeExtend(btcSignedDataPackagesResponse, mockRequestParams);
    expect(didExtendBtc).toBeTruthy();

    const result2 = sut.get(mockRequestParams);
    expect(result2).toEqual(mockSignedDataPackagesResponse);
  });

  it("should not extend when new feedIds intersect the cached ones (subset)", () => {
    sut.update(mockSignedDataPackagesResponse, mockRequestParams);

    const ethSignedDataPackagesResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
    };

    const didExtendEth = sut.maybeExtend(ethSignedDataPackagesResponse, mockRequestParams);
    expect(didExtendEth).toBeFalsy();

    const result = sut.get(mockRequestParams);
    expect(result).toEqual(mockSignedDataPackagesResponse);
  });

  it("should not extend when new feedIds intersect the cached ones (superset)", () => {
    const ethSignedDataPackagesResponse = {
      ETH: mockSignedDataPackagesResponse["ETH"],
    };

    sut.update(ethSignedDataPackagesResponse, mockRequestParams);

    const didExtend = sut.maybeExtend(mockSignedDataPackagesResponse, mockRequestParams);
    expect(didExtend).toBeFalsy();
  });
});

describe("isConforming tests", () => {
  const thisRequestParams: DataPackagesRequestParams = {
    dataServiceId: "service",
    dataPackagesIds: ["ETH"],
    uniqueSignersCount: 1,
    ignoreMissingFeed: true,
    authorizedSigners: getSignersForDataServiceId("redstone-main-demo"),
  };

  it("should return true if ignoreMissingFeed is true", () => {
    for (const otherPrams of [
      { ...thisRequestParams },
      { ...thisRequestParams, dataPackagesIds: ["BTC", "ETH"] },
      { ...thisRequestParams, dataPackagesIds: ["BTC"] },
    ]) {
      expect(isConforming(thisRequestParams, otherPrams, ["BTC"])).toBe(true);
      expect(isConforming(thisRequestParams, otherPrams, ["ETH"])).toBe(true);
      expect(isConforming(thisRequestParams, otherPrams, ["ETH", "BTC"])).toBe(true);
    }
  });

  it("should return true if ignoreMissingFeed is false, but current response conforms", () => {
    const thisNewParams = { ...thisRequestParams, ignoreMissingFeed: false };

    for (const otherPrams of [
      { ...thisNewParams },
      { ...thisNewParams, dataPackagesIds: ["BTC"] },
      { ...thisNewParams, dataPackagesIds: ["BTC", "ETH"] },
    ]) {
      expect(isConforming(thisNewParams, otherPrams, ["ETH", "BTC"])).toBe(true);
    }
  });

  it("should return false ignoreMissingFeed is false, but current doesn't conform", () => {
    const thisNewParams = {
      ...thisRequestParams,
      dataPackagesIds: ["ETH", "BTC"],
      ignoreMissingFeed: false,
    };

    expect(isConforming(thisNewParams, { ...thisNewParams }, ["BTC"])).toBe(false);
  });

  it("should return false if one of important request params is not equal", () => {
    for (const otherPrams of [
      { ...thisRequestParams, dataServiceId: "other-service" },
      { ...thisRequestParams, uniqueSignersCount: 2 },
      { ...thisRequestParams, authorizedSigners: ["0x00"] },
      { ...thisRequestParams, maxTimestampDeviationMS: 123 },
      { ...thisRequestParams, historicalTimestamp: 123 },
      { ...thisRequestParams, ignoreMissingFeed: false },
    ]) {
      expect(isConforming(thisRequestParams, otherPrams, ["ETH"])).toBe(false);
    }
  });

  it("should return true if one of not important request params is not equal", () => {
    for (const otherPrams of [
      { ...thisRequestParams, waitForAllGatewaysTimeMs: 123 },
      { ...thisRequestParams, urls: ["https://"] },
      { ...thisRequestParams, enableEnhancedLogs: true },
    ]) {
      expect(isConforming(thisRequestParams, otherPrams, ["ETH"])).toBe(true);
    }
  });
});

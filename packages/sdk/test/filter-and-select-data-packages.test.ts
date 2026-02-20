import {
  DataPackagesRequestParams,
  DataPackagesResponse,
  filterAndSelectDataPackages,
} from "../src";
import { makeMockSignedDataPackage } from "./mocks/mock-packages";
import { makeReqParamsFactory } from "./mocks/mock-req-params";

const getReqParams = (): DataPackagesRequestParams => ({
  dataPackagesIds: ["BTC", "ETH"],
  dataServiceId: "mock-data-service-tests",
  uniqueSignersCount: 2,
  authorizedSigners: [
    "0x4fE51A2963a44Cd3DABB05AEe14b9F9A4652fF6b",
    "0x799DFAfc2F6f5d90c3fEdD70ae037DBDaC201668",
    "0x9Cc1aDE00B4BFC67a9E1D222eA6DAF1399c525F1",
    "0x5416Ff1BaCBD144E63705c675Fb6999288E1b27d",
    "0x5501D3042042f567A555bF05C3897Fda57Be2633",
    "0x43c6AF28BBa09EB95534CC853D8887DB0Cda6226",
    "0xe98fF207D73bF34959f05fb671cbcA2431012E02",
    "0x5C48b10B53b968bCfC85a0D1CB040857AA8d9254",
    "0x742d7Da79B0b836C2F095c9d8F7F1A2dc7c81A48",
    "0x5416Ff1BaCBD144E63705c675Fb6999288E1b27d",
  ],
});

const makeReqParams = makeReqParamsFactory({
  ...getReqParams(),
  skipSignatureVerification: true,
  uniqueSignersCount: 1,
  dataPackagesIds: ["ETH"],
});

describe("filterAndSelectDataPackages", () => {
  it("should filter response to requested dataPackagesIds only", () => {
    const response: DataPackagesResponse = {
      ETH: [makeMockSignedDataPackage("ETH", 1000)],
      BTC: [makeMockSignedDataPackage("BTC", 20000)],
      AVAX: [makeMockSignedDataPackage("AVAX", 15)],
    };

    const result = filterAndSelectDataPackages(
      response,
      makeReqParams({ dataPackagesIds: ["ETH", "BTC"] })
    );

    expect(Object.keys(result)).toEqual(expect.arrayContaining(["ETH", "BTC"]));
    expect(result["AVAX"]).toBeUndefined();
  });

  it("should apply median selection by default", () => {
    const response: DataPackagesResponse = {
      ETH: [
        makeMockSignedDataPackage("ETH", 1000),
        makeMockSignedDataPackage("ETH", 1001),
        makeMockSignedDataPackage("ETH", 990),
      ],
    };

    const result = filterAndSelectDataPackages(response, makeReqParams({ uniqueSignersCount: 2 }));

    const values = result["ETH"]!.map((dp) => dp.toObj().dataPoints[0].value);

    expect(values).toEqual([1000, 1001]);
  });

  it("should skip median selection when disableMedianSelection is true", () => {
    const response: DataPackagesResponse = {
      ETH: [
        makeMockSignedDataPackage("ETH", 1000),
        makeMockSignedDataPackage("ETH", 1001),
        makeMockSignedDataPackage("ETH", 990),
      ],
    };

    const result = filterAndSelectDataPackages(
      response,
      makeReqParams({ uniqueSignersCount: 1, disableMedianSelection: true })
    );

    const values = result["ETH"]!.map((dp) => dp.toObj().dataPoints[0].value);

    expect(values).toEqual([1000, 1001, 990]);
  });

  it("should throw for missing data feed when ignoreMissingFeed is false", () => {
    const response: DataPackagesResponse = {
      ETH: [makeMockSignedDataPackage("ETH", 1000)],
    };

    expect(() =>
      filterAndSelectDataPackages(response, makeReqParams({ dataPackagesIds: ["ETH", "BTC"] }))
    ).toThrow("Requested data feed id is not included in response: BTC");
  });

  it("should not throw for missing data feed when ignoreMissingFeed is true", () => {
    const response: DataPackagesResponse = {
      ETH: [makeMockSignedDataPackage("ETH", 1000)],
    };

    const result = filterAndSelectDataPackages(
      response,
      makeReqParams({ dataPackagesIds: ["ETH", "BTC"], ignoreMissingFeed: true })
    );

    expect(result["ETH"]).toBeDefined();
    expect(result["BTC"]).toBeUndefined();
  });

  it("should aggregate errors when aggregateErrors is true", () => {
    const response: DataPackagesResponse = {};

    expect(() =>
      filterAndSelectDataPackages(
        response,
        makeReqParams({ dataPackagesIds: ["ETH", "BTC"], aggregateErrors: true })
      )
    ).toThrow(AggregateError);
  });

  it("should throw TooFewSigners when not enough packages", () => {
    const response: DataPackagesResponse = {
      ETH: [makeMockSignedDataPackage("ETH", 1000)],
    };

    expect(() =>
      filterAndSelectDataPackages(response, makeReqParams({ uniqueSignersCount: 3 }))
    ).toThrow("Too few data packages with unique signers for the data feed: ETH");
  });
});

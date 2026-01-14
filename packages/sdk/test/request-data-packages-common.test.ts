import { SignedDataPackage } from "@redstone-finance/protocol";
import {
  DataPackagesResponse,
  filterRetainingPackagesForDataFeedIds,
  getDataPackagesWithFeedIds,
} from "../src";

const MULTI_PACKAGE_ID = "__MULTI__";
const createMockSignedPackage = (feedIds: string[]) =>
  SignedDataPackage.fromObj({
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataPoints: feedIds.map((dataFeedId) => ({ dataFeedId, value: 1000 })),
    timestampMilliseconds: Date.now(),
    dataPackageId: feedIds.length === 1 ? feedIds[0] : MULTI_PACKAGE_ID,
  });

describe("filterRetainingPackagesForDataFeedIds", () => {
  describe("single feed packages", () => {
    it("returns packages matching single feedId", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        BTC: [createMockSignedPackage(["BTC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH"]);

      expect(Object.keys(result)).toEqual(["ETH"]);
    });

    it("returns packages matching any of requested feedIds", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        BTC: [createMockSignedPackage(["BTC"])],
        USDC: [createMockSignedPackage(["USDC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH", "USDC"]);

      expect(Object.keys(result).sort()).toEqual(["ETH", "USDC"]);
    });

    it("returns empty object when no feedIds match", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["DOGE"]);

      expect(result).toEqual({});
    });
  });

  describe("multi feed packages (__MULTI__)", () => {
    it("returns multi package when one of its feedIds matches", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [createMockSignedPackage(["ETH", "BTC", "USDC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH"]);

      expect(Object.keys(result)).toEqual([MULTI_PACKAGE_ID]);
    });

    it("returns multi package when multiple feedIds match", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [createMockSignedPackage(["ETH", "BTC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH", "BTC"]);

      expect(Object.keys(result)).toEqual([MULTI_PACKAGE_ID]);
    });

    it("does not return multi package when no feedIds match", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [createMockSignedPackage(["ETH", "BTC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["DOGE"]);

      expect(result).toEqual({});
    });

    it("handles mixed single and multi packages", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        __MULTI__: [createMockSignedPackage(["BTC", "USDC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH", "BTC"]);

      expect(Object.keys(result).sort()).toEqual(["ETH", MULTI_PACKAGE_ID]);
    });

    it("returns only matching packages from mixed response", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        __MULTI__: [createMockSignedPackage(["DOGE", "SHIB"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH"]);

      expect(Object.keys(result)).toEqual(["ETH"]);
    });
  });

  describe("edge cases", () => {
    it("handles empty response", () => {
      const result = filterRetainingPackagesForDataFeedIds({}, ["ETH"]);

      expect(result).toEqual({});
    });

    it("handles empty requestedFeedIds", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        __MULTI__: [createMockSignedPackage(["BTC", "USDC"])],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, []);

      expect(result).toEqual({});
    });

    it("handles undefined values in response", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        BTC: undefined,
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH", "BTC"]);

      expect(Object.keys(result)).toEqual(["ETH"]);
    });

    it("preserves all SignedDataPackages for matching key", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [
          createMockSignedPackage(["ETH", "BTC"]),
          createMockSignedPackage(["ETH", "BTC"]),
        ],
      };

      const result = filterRetainingPackagesForDataFeedIds(response, ["ETH"]);

      expect(result.__MULTI__).toHaveLength(2);
    });
  });
});

describe("getDataPackagesWithFeedIds", () => {
  describe("default behavior (includeMultiPointPackagesOnly = false)", () => {
    it("returns single feed package with feedIds", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(result.ETH).toBeDefined();
      expect(result.ETH.feedIds).toEqual(["ETH"]);
      expect(result.ETH.dataPackage).toHaveLength(1);
    });

    it("returns multi feed package with all feedIds", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [createMockSignedPackage(["ETH", "BTC", "USDC"])],
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(result.__MULTI__.feedIds).toEqual(["ETH", "BTC", "USDC"]);
    });

    it("returns both single and multi packages", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        __MULTI__: [createMockSignedPackage(["BTC", "USDC"])],
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(Object.keys(result).sort()).toEqual(["ETH", "__MULTI__"]);
    });

    it("filters out undefined values", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        BTC: undefined,
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(Object.keys(result)).toEqual(["ETH"]);
      expect(result.BTC).toBeUndefined();
    });
  });

  describe("includeMultiPointPackagesOnly = true", () => {
    it("returns only multi packages", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        __MULTI__: [createMockSignedPackage(["BTC", "USDC"])],
      };

      const result = getDataPackagesWithFeedIds(response, true);

      expect(Object.keys(result)).toEqual(["__MULTI__"]);
    });

    it("returns empty when no multi packages exist", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"])],
        BTC: [createMockSignedPackage(["BTC"])],
      };

      const result = getDataPackagesWithFeedIds(response, true);

      expect(result).toEqual({});
    });

    it("returns multiple multi packages", () => {
      const response: DataPackagesResponse = {
        __MULTI__: [createMockSignedPackage(["ETH", "BTC"])],
        ETH: [createMockSignedPackage(["ETH"])],
      };

      const result = getDataPackagesWithFeedIds(response, true);

      expect(Object.keys(result)).toEqual(["__MULTI__"]);
      expect(result.__MULTI__.feedIds).toEqual(["ETH", "BTC"]);
    });
  });

  describe("edge cases", () => {
    it("handles empty response", () => {
      const result = getDataPackagesWithFeedIds({});

      expect(result).toEqual({});
    });

    it("handles response with all undefined values", () => {
      const response: DataPackagesResponse = {
        ETH: undefined,
        BTC: undefined,
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(result).toEqual({});
    });

    it("preserves multiple SignedDataPackages per key", () => {
      const response: DataPackagesResponse = {
        ETH: [createMockSignedPackage(["ETH"]), createMockSignedPackage(["ETH"])],
      };

      const result = getDataPackagesWithFeedIds(response);

      expect(result.ETH.dataPackage).toHaveLength(2);
    });
  });
});

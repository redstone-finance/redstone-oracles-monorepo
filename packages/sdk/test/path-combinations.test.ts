import axios from "axios";
import {
  DataPackagesRequestParams,
  requestDataPackages,
} from "../src/request-data-packages";

export const getReqParams = (urls?: string[]): DataPackagesRequestParams => {
  return {
    dataPackagesIds: ["BTC", "ETH"],
    dataServiceId: "mock-data-service-tests",
    uniqueSignersCount: 2,
    urls: urls!,
    authorizedSigners: [
      "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
      "0x00d40e37f53b10dc0D2C84733dc1744440F404f3",
      "0xe3E26eF988eBB05Cd78C8B4eE38b7049BC689836",
      "0x5416Ff1BaCBD144E63705c675Fb6999288E1b27d",
    ],
  };
};

jest.mock("axios");

const DATA_SERVICE_ID = "mock-data-service-tests";
const HISTORICAL_TIMESTAMP = 1726124100000;

describe("Path construction in requestDataPackages", () => {
  const testScenarios = [
    {
      params: { hideMetadata: false, historicalTimestamp: undefined },
      expectedPaths: ["/data-packages/latest/:dataServiceId/show-metadata"],
    },
    {
      params: { historicalTimestamp: undefined },
      expectedPaths: ["/data-packages/latest/:dataServiceId"],
    },
    {
      params: {
        hideMetadata: false,
        historicalTimestamp: HISTORICAL_TIMESTAMP,
      },
      expectedPaths: [
        "/data-packages/historical/:dataServiceId/:timestamp/show-metadata",
      ],
    },
    {
      params: {
        hideMetadata: false,
        historicalTimestamp: HISTORICAL_TIMESTAMP,
      },
      expectedPaths: ["/data-packages/historical/:dataServiceId/:timestamp"],
    },
  ];

  const baseUrlVariations = ["http://valid-cache.com/v2", ""];

  testScenarios.forEach(({ params, expectedPaths }) => {
    describe(`Scenario: ${JSON.stringify(params)}`, () => {
      baseUrlVariations.forEach((baseUrl) => {
        const testUrl = baseUrl;
        const expectedPathPatterns = expectedPaths.map((pattern) => {
          return `${testUrl}${pattern}`
            .replace(":dataServiceId", DATA_SERVICE_ID)
            .replace(":timestamp", String(HISTORICAL_TIMESTAMP));
        });

        it(`generates correct path for ${testUrl}`, async () => {
          (axios.get as jest.Mock).mockClear();

          jest
            .spyOn(axios, "get")
            .mockRejectedValue(new Error("Request failed"));

          // Capture the expected URL before the request
          let calledUrl: string | undefined;
          jest.spyOn(axios, "get").mockImplementation((url: string) => {
            calledUrl = url;
            throw new Error("Request failed");
          });

          await expect(async () => {
            await requestDataPackages({
              ...getReqParams(),
              dataServiceId: DATA_SERVICE_ID,
              ...params,
              ...(params.historicalTimestamp && {
                historicalTimestamp: HISTORICAL_TIMESTAMP,
              }),
            });
          }).rejects.toThrow();

          const matchedPattern = expectedPathPatterns.some(
            (pattern) =>
              calledUrl && calledUrl.match(pattern.replace(/:\w+/g, "[^/]+"))
          );

          expect(matchedPattern).toBe(true);
        });
      });
    });
  });
});

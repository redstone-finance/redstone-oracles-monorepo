import axios from "axios";
import fetchers from "../../src/fetchers/index";

// Mock axios response
const exampleResponse = {
  A: {
    B: {
      C: 42,
    },
  },
};
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("custom URL fetcher", () => {
  const sut = fetchers["custom-urls"];

  it("Should properly fetch data", async () => {
    // Given
    mockedAxios.get.mockResolvedValue({ data: exampleResponse });

    // When
    const result = await sut.fetchAll(["0x8edd634f1bbd8320"], {
      manifest: {
        defaultSource: ["custom-urls"],
        interval: 10000,
        maxPriceDeviationPercent: 25,
        priceAggregator: "median",
        sourceTimeout: 2000,
        evmChainId: 1,
        enableArweaveBackup: false,
        tokens: {
          "0x8edd634f1bbd8320": {
            customUrlDetails: {
              url: "https://example-custom-data-source.com/hehe",
              jsonpath: "$.A.B.C",
            },
            comment: "Test url with jsonpath",
            maxPriceDeviationPercent: 80,
          },
        },
      },
      credentials: {},
    });

    // Then
    expect(result).toEqual([
      {
        symbol: "0x8edd634f1bbd8320",
        value: 42,
      },
    ]);
  });
});

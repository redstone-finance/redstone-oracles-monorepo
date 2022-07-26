import fetchers from "../../src/fetchers/index";
import { mockFetcherResponse } from "./_helpers";
import {
  TwapFetcher,
  HistoricalPrice,
} from "../../src/fetchers/twap/TwapFetcher";

const pathToExampleResponse = "../../src/fetchers/twap/example-response.json";
const expectedTwapFetcherResult = [
  {
    symbol: "BTC-TWAP-60",
    value: 43292.29198643936,
  },
];
const defaultPriceValues = {
  symbol: "",
  timestamp: 0,
  value: 0,
  signature: "",
  version: "",
};

jest.mock("axios");

describe("twap fetcher", () => {
  const sut = fetchers["twap-I-5rWUehEv-MjdK9gFw09RxfSLQX9DIHxG614Wf8qo0"];

  it("should properly fetch data", async () => {
    // Given
    mockFetcherResponse(pathToExampleResponse);

    // When
    const result = await sut.fetchAll(["BTC-TWAP-60"]);

    // Then
    expect(result).toEqual(expectedTwapFetcherResult);
  });

  it("should properly calculate twap value", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 2,
        timestamp: 0,
      },
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 20,
      },
      {
        ...defaultPriceValues,
        value: 12,
        timestamp: 100,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(7);
  });

  it("should properly calculate twap value for unsorted prices array", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 2,
        timestamp: 0,
      },
      {
        ...defaultPriceValues,
        value: 12,
        timestamp: 100,
      },
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 20,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(7);
  });

  it("should properly calculate twap value for a single price", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 20,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(4);
  });

  it("should properly calculate twap value for the same price at two given time points", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 1,
        timestamp: 0,
      },
      {
        ...defaultPriceValues,
        value: 1,
        timestamp: 1,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(1);
  });

  it("should properly calculate twap value with 0 price", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 0,
        timestamp: 0,
      },
      {
        ...defaultPriceValues,
        value: 0,
        timestamp: 1,
      },
      {
        ...defaultPriceValues,
        value: 1,
        timestamp: 2,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(0.25);
  });

  it("should properly calculate twap value for two prices at the same timestamp", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 20,
      },
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 20,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(4);
  });

  it("should properly calculate twap ignoring corrupted values", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 1,
        timestamp: 1,
      },
      {
        ...defaultPriceValues,
        value: 3,
        timestamp: 2,
      },
      {
        ...defaultPriceValues,
        value: NaN,
        timestamp: 3,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(2);
  });

  it("should properly calculate twap value for multiple prices at the same timestamp", () => {
    // Given
    const prices = [
      {
        ...defaultPriceValues,
        value: 1,
        timestamp: 1,
      },
      {
        ...defaultPriceValues,
        value: 2,
        timestamp: 2,
      },
      {
        ...defaultPriceValues,
        value: 4,
        timestamp: 2,
      },
    ];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(2);
  });

  it("should return undefined for an empty array", () => {
    // Given
    const prices: HistoricalPrice[] = [];

    // When
    const twapValue = TwapFetcher.getTwapValue(prices);

    // Then
    expect(twapValue).toBe(undefined);
  });
});

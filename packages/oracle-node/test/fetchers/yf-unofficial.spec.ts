import fetchers from "../../src/fetchers/index";

jest.mock("../../src/fetchers/yf-unofficial/YahooFinanceProxy", () => {
  return jest.fn().mockImplementation(() => {
    return {
      getExchangeRates: () => {
        const exampleResponse = require("../../src/fetchers/yf-unofficial/example-response.json");

        return Promise.resolve(exampleResponse);
      },
    };
  });
});

describe("yf-unofficial fetcher", () => {
  const sut = fetchers["yf-unofficial"];

  it("should properly fetch data", async () => {
    // Given

    // When
    const result = await sut.fetchAll([
      "TSLA",
      "AMZN",
      "GOOG",
      "IBM",
      "AAPL",
      "CHF",
      "MXN",
      "BRLUSD=X",
      "COPUSD=X",
      "ARS",
      "PEN",
    ]);

    // Then
    expect(result).toEqual([
      {
        symbol: "TSLA",
        value: 986.95,
      },
      {
        symbol: "AMZN",
        value: 3015.75,
      },
      {
        symbol: "GOOG",
        value: 2567.49,
      },
      {
        symbol: "IBM",
        value: 125.98,
      },
      {
        symbol: "AAPL",
        value: 167.66,
      },
      {
        symbol: "CHF",
        value: 1.0700796,
      },
      {
        symbol: "MXN",
        value: 0.05058169,
      },
      {
        symbol: "BRLUSD=X",
        value: 0.2149382,
      },
      {
        symbol: "COPUSD=X",
        value: 0.0002667983,
      },
      {
        symbol: "ARS",
        value: 0.008877053,
      },
      {
        symbol: "PEN",
        value: 0.26877385,
      },
    ]);
  });
});

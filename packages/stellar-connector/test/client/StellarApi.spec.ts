import { API_TYPE_HORIZON, API_TYPE_RPC, StellarApi } from "../../src/client/StellarApi";

describe("StellarApi", () => {
  it("should treat an untyped url as rpc", () => {
    const api = StellarApi.parseUrl("https://mainnet.sorobanrpc.com");

    expect(api.type).toBe(API_TYPE_RPC);
    expect(api.baseUrl).toBe("https://mainnet.sorobanrpc.com/");
  });

  it("should parse a horizon-typed url", () => {
    const api = StellarApi.parseUrl("https://horizon.stellar.org#type=horizon");

    expect(api.type).toBe(API_TYPE_HORIZON);
    expect(api.baseUrl).toBe("https://horizon.stellar.org/");
  });

  it("should reject an unknown url type", () => {
    expect(() => StellarApi.parseUrl("https://horizon.stellar.org#type=graphql")).toThrow(
      'Unknown URL type "graphql"'
    );
  });
});

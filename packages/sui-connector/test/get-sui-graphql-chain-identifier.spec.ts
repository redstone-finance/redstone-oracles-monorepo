import { getSuiGraphqlChainIdentifier } from "../src/client/get-sui-graphql-chain-identifier";

const mockQuery = jest.fn();

jest.mock("@mysten/sui/graphql", () => ({
  SuiGraphQLClient: jest.fn().mockImplementation(() => ({ query: mockQuery })),
}));

describe("getSuiGraphqlChainIdentifier", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns the chainIdentifier reported by the graphql endpoint", async () => {
    mockQuery.mockResolvedValue({ data: { chainIdentifier: "0xabc" } });

    await expect(getSuiGraphqlChainIdentifier("https://sui.example", "mainnet")).resolves.toBe(
      "0xabc"
    );
  });

  it("throws when the graphql response contains errors", async () => {
    mockQuery.mockResolvedValue({ errors: [{ message: "endpoint unreachable" }] });

    await expect(getSuiGraphqlChainIdentifier("https://sui.example", "mainnet")).rejects.toThrow(
      "endpoint unreachable"
    );
  });

  it("throws when the graphql response has no chainIdentifier", async () => {
    mockQuery.mockResolvedValue({ data: {} });

    await expect(getSuiGraphqlChainIdentifier("https://sui.example", "mainnet")).rejects.toThrow(
      "no chainIdentifier"
    );
  });
});

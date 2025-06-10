import chai from "chai";
import {
  ChainType,
  deconstructNetworkId,
  NetworkId,
  NetworkIdSchema,
} from "../src";

describe("NetworkIdSchema", () => {
  const stringNumeralCases = ["5", "1", "56"];

  const validCases = [
    ...stringNumeralCases,
    5,
    1,
    "solana/1",
    "movement/999",
    "radix/3",
    "sui/1234",
  ];

  const invalidCases = [
    "evm/1",
    "arbitrum/5",
    "01",
    "solana/-1",
    "żaba",
    "sui/",
    "movement/01",
    "fuel/abc",
    {},
    null,
    undefined,
  ];

  describe("should parse valid NetworkId values", () => {
    validCases.forEach((value) => {
      it(`accepts ${JSON.stringify(value)}`, () => {
        chai.expect(() => NetworkIdSchema.parse(value)).to.not.throw();
      });
    });
  });

  describe("should reject invalid NetworkId values", () => {
    invalidCases.forEach((value) => {
      it(`rejects ${JSON.stringify(value)}`, () => {
        chai.expect(() => NetworkIdSchema.parse(value)).to.throw();
      });
    });
  });

  describe("should parse string numerals into numbers", () => {
    stringNumeralCases.forEach((value) => {
      it(`parses ${JSON.stringify(value)} into number`, () => {
        chai.expect(NetworkIdSchema.parse(value)).to.deep.equal(Number(value));
        chai.expect(typeof NetworkIdSchema.parse(value) === "number");
      });
    });
  });
});

describe("deconstructNetworkId", () => {
  const evmCases: Array<NetworkId> = [1, 56, 4200];
  const nonEvmCases: Array<{
    input: NetworkId;
    expected: { chainType: ChainType; chainId: number };
  }> = [
    { input: "solana/1", expected: { chainType: "solana", chainId: 1 } },
    { input: "sui/42", expected: { chainType: "sui", chainId: 42 } },
    { input: "movement/3", expected: { chainType: "movement", chainId: 3 } },
  ];

  describe("should parse numeric and numeric string NetworkIds as evm", () => {
    evmCases.forEach((value) => {
      it(`parses ${JSON.stringify(value)} as evm`, () => {
        const result = deconstructNetworkId(value);
        chai.expect(result).to.deep.equal({
          chainType: "evm",
          chainId: Number(value),
        });
      });
    });
  });

  describe("should parse <chainType>/<chainId> strings correctly", () => {
    nonEvmCases.forEach(({ input, expected }) => {
      it(`parses ${input} to { chainType: ${expected.chainType}, chainId: ${expected.chainId} }`, () => {
        const result = deconstructNetworkId(input);
        chai.expect(result).to.deep.equal(expected);
      });
    });
  });

  describe("should throw on invalid input", () => {
    const invalidCases: string[] = [
      "solana/abc",
      "fuel/",
      "movement/-1",
      "evm/1",
    ];

    invalidCases.forEach((input) => {
      it(`throws on invalid networkId: ${input}`, () => {
        chai.expect(() => deconstructNetworkId(input as NetworkId)).to.throw();
      });
    });
  });
});

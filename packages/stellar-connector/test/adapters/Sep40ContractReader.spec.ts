/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Address, Contract } from "@stellar/stellar-sdk";
import { Sep40ContractReader } from "../../src/adapters/Sep40ContractReader";
import { assetToScVal, Sep40Asset } from "../../src/sep-40-types";
import { StellarClient } from "../../src/stellar/StellarClient";

function contractIdFromSeed(seed: number) {
  return Address.contract(Buffer.alloc(32, seed)).toString();
}

function otherAsset(symbol: string): Sep40Asset {
  return { tag: "Other", symbol };
}

function makeContractDataEntry(asset: Sep40Asset) {
  const scVal = assetToScVal(asset);

  return {
    val: {
      contractData: () => ({
        val: () => scVal,
      }),
    },
  };
}

function makeReader(seed: number) {
  const contractId = contractIdFromSeed(seed);
  const client = {
    getContractData: jest.fn(),
    fetchEntriesByKey: jest.fn(),
  };
  const reader = new Sep40ContractReader(
    client as unknown as StellarClient,
    new Contract(contractId)
  );

  return { reader, client };
}

function stubGetContractData(
  client: { getContractData: jest.Mock },
  asset: Sep40Asset | undefined
) {
  if (asset === undefined) {
    client.getContractData.mockResolvedValueOnce(undefined);

    return;
  }

  client.getContractData.mockImplementationOnce(
    (_c: unknown, _k: unknown, transform: (entry: unknown) => unknown) =>
      Promise.resolve(transform(makeContractDataEntry(asset)))
  );
}

describe("Sep40ContractReader asset caching", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("feedToAsset", () => {
    it("fetches from the client and returns the asset on cold cache", async () => {
      const { reader, client } = makeReader(1);
      stubGetContractData(client, otherAsset("BTC"));

      const result = await reader.feedToAsset("BTC");

      expect(result).toEqual(otherAsset("BTC"));
      expect(client.getContractData).toHaveBeenCalledTimes(1);
    });

    it("returns cached asset without calling the client on warm cache", async () => {
      const { reader, client } = makeReader(2);
      stubGetContractData(client, otherAsset("ETH"));

      await reader.feedToAsset("ETH");
      const result = await reader.feedToAsset("ETH");

      expect(result).toEqual(otherAsset("ETH"));
      expect(client.getContractData).toHaveBeenCalledTimes(1);
    });

    it("does not cache undefined results", async () => {
      const { reader, client } = makeReader(3);
      stubGetContractData(client, undefined);
      stubGetContractData(client, undefined);

      await reader.feedToAsset("UNKNOWN");
      await reader.feedToAsset("UNKNOWN");

      expect(client.getContractData).toHaveBeenCalledTimes(2);
    });

    it("isolates caches by contract address", async () => {
      const a = makeReader(4);
      const b = makeReader(5);
      stubGetContractData(a.client, otherAsset("A-SOL"));
      stubGetContractData(b.client, otherAsset("B-SOL"));

      const resultA = await a.reader.feedToAsset("SOL");
      const resultB = await b.reader.feedToAsset("SOL");

      expect(resultA).toEqual(otherAsset("A-SOL"));
      expect(resultB).toEqual(otherAsset("B-SOL"));
      expect(a.client.getContractData).toHaveBeenCalledTimes(1);
      expect(b.client.getContractData).toHaveBeenCalledTimes(1);
    });

    it("refetches after ttl expiry", async () => {
      const { reader, client } = makeReader(6);
      stubGetContractData(client, otherAsset("XLM"));
      stubGetContractData(client, otherAsset("XLM"));

      await reader.feedToAsset("XLM");
      jest.advanceTimersByTime(10 * 60 * 1000);
      await reader.feedToAsset("XLM");

      expect(client.getContractData).toHaveBeenCalledTimes(2);
    });

    it("shares the cache with feedsToAssets", async () => {
      const { reader, client } = makeReader(7);
      stubGetContractData(client, otherAsset("ADA"));

      await reader.feedToAsset("ADA");
      const [result] = await reader.feedsToAssets(["ADA"]);

      expect(result).toEqual(otherAsset("ADA"));
      expect(client.fetchEntriesByKey).not.toHaveBeenCalled();
    });
  });

  describe("feedsToAssets", () => {
    it("returns empty array without calling the client for empty input", async () => {
      const { reader, client } = makeReader(8);

      const result = await reader.feedsToAssets([]);

      expect(result).toEqual([]);
      expect(client.fetchEntriesByKey).not.toHaveBeenCalled();
    });

    it("fetches all feeds on cold cache and preserves order", async () => {
      const { reader, client } = makeReader(9);
      client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("BTC")),
        makeContractDataEntry(otherAsset("ETH")),
        makeContractDataEntry(otherAsset("SOL")),
      ]);

      const result = await reader.feedsToAssets(["BTC", "ETH", "SOL"]);

      expect(result).toEqual([otherAsset("BTC"), otherAsset("ETH"), otherAsset("SOL")]);
      expect(client.fetchEntriesByKey).toHaveBeenCalledTimes(1);
    });

    it("does not call the client when every feed is cached", async () => {
      const { reader, client } = makeReader(10);
      client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("BTC")),
        makeContractDataEntry(otherAsset("ETH")),
      ]);
      await reader.feedsToAssets(["BTC", "ETH"]);
      client.fetchEntriesByKey.mockClear();

      const result = await reader.feedsToAssets(["BTC", "ETH"]);

      expect(result).toEqual([otherAsset("BTC"), otherAsset("ETH")]);
      expect(client.fetchEntriesByKey).not.toHaveBeenCalled();
    });

    it("only fetches missing feeds and places results at correct indices", async () => {
      const { reader, client } = makeReader(11);
      client.fetchEntriesByKey.mockResolvedValueOnce([makeContractDataEntry(otherAsset("ETH"))]);
      await reader.feedsToAssets(["ETH"]);

      client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("BTC")),
        makeContractDataEntry(otherAsset("SOL")),
      ]);

      const result = await reader.feedsToAssets(["BTC", "ETH", "SOL"]);

      expect(result).toEqual([otherAsset("BTC"), otherAsset("ETH"), otherAsset("SOL")]);
      expect(client.fetchEntriesByKey).toHaveBeenCalledTimes(2);
      const [secondCallArg] = client.fetchEntriesByKey.mock.calls[1];
      expect(secondCallArg).toHaveLength(2);
    });

    it("returns undefined for missing entries without caching them", async () => {
      const { reader, client } = makeReader(12);
      client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("BTC")),
        undefined,
        makeContractDataEntry(otherAsset("SOL")),
      ]);

      const result = await reader.feedsToAssets(["BTC", "MISSING", "SOL"]);

      expect(result).toEqual([otherAsset("BTC"), undefined, otherAsset("SOL")]);

      client.fetchEntriesByKey.mockResolvedValueOnce([undefined]);
      await reader.feedsToAssets(["MISSING"]);

      expect(client.fetchEntriesByKey).toHaveBeenCalledTimes(2);
    });

    it("isolates caches across contracts", async () => {
      const a = makeReader(13);
      const b = makeReader(14);
      a.client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("A-BTC")),
      ]);
      b.client.fetchEntriesByKey.mockResolvedValueOnce([
        makeContractDataEntry(otherAsset("B-BTC")),
      ]);

      const [resultA] = await a.reader.feedsToAssets(["BTC"]);
      const [resultB] = await b.reader.feedsToAssets(["BTC"]);

      expect(resultA).toEqual(otherAsset("A-BTC"));
      expect(resultB).toEqual(otherAsset("B-BTC"));
    });
  });
});

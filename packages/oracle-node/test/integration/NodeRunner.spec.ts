import NodeRunner from "../../src/NodeRunner";
import { JWKInterface } from "arweave/node/lib/wallet";
import { mocked } from "ts-jest/utils";
import ArweaveProxy from "../../src/arweave/ArweaveProxy";
import fetchers from "../../src/fetchers";
import axios from "axios";
import ArweaveService from "../../src/arweave/ArweaveService";
import { any } from "jest-mock-extended";
import { timeout } from "../../src/utils/promise-timeout";
import { MOCK_NODE_CONFIG } from "../helpers";

/****** MOCKS START ******/
const mockArProxy = {
  getAddress: () => Promise.resolve("mockArAddress"),
};
jest.mock("../../src/arweave/ArweaveProxy", () => {
  return jest.fn().mockImplementation(() => mockArProxy);
});

const mockBundlrProxy = {
  getBalance: jest.fn(),
  prepareSignedTrasaction: jest.fn().mockResolvedValue({
    id: "mockBundlrTransactionId",
  }),
  uploadBundlrTransaction: jest.fn(),
};
jest.mock("../../src/arweave/BundlrProxy", () => {
  return jest.fn().mockImplementation(() => mockBundlrProxy);
});

jest.mock("../../src/fetchers/coingecko/CoingeckoFetcher");
jest.mock("../../src/fetchers/uniswap/UniswapFetcher");

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.post.mockImplementation((url) => {
  if (url == "https://api.redstone.finance/metrics") {
    return Promise.resolve();
  }
  return Promise.reject(
    `mock for ${url} not available and should not be called`
  );
});

let manifest: any = null;

jest.mock("../../src/utils/objects", () => ({
  // @ts-ignore
  ...jest.requireActual("../../src/utils/objects"),
  readJSON: () => null,
}));

jest.mock("uuid", () => ({ v4: () => "00000000-0000-0000-0000-000000000000" }));
/****** MOCKS END ******/

describe("NodeRunner", () => {
  const jwk: JWKInterface = {
    e: "e",
    kty: "kty",
    n: "n",
  };

  const nodeConfig = MOCK_NODE_CONFIG;

  beforeEach(() => {
    jest.useFakeTimers();
    mockBundlrProxy.getBalance.mockClear();
    mockBundlrProxy.prepareSignedTrasaction.mockClear();
    mockBundlrProxy.uploadBundlrTransaction.mockClear();
    mockedAxios.post.mockClear();

    jest.spyOn(global.Date, "now").mockImplementation(() => 111111111);

    fetchers["coingecko"] = {
      fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: 444 }]),
    };
    fetchers["uniswap"] = {
      fetchAll: jest.fn().mockResolvedValue([{ symbol: "BTC", value: 445 }]),
    };

    manifest = {
      defaultSource: ["uniswap"],
      interval: 10000,
      maxPriceDeviationPercent: 25,
      priceAggregator: "median",
      sourceTimeout: 2000,
      evmChainId: 1,
      enableArweaveBackup: true,
      tokens: {
        BTC: {
          source: ["coingecko"],
        },
        ETH: {},
      },
      httpBroadcasterURLs: ["http://localhost:9000"],
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should create node instance", async () => {
    // given
    const mockedArProxy = mocked(ArweaveProxy, true);

    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });

    // then
    expect(sut).not.toBeNull();
    expect(mockedArProxy).toHaveBeenCalledWith(jwk);
  });

  it("should throw if no maxDeviationPercent configured for token", async () => {
    // given
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);
    manifest = JSON.parse(`{
        "defaultSource": ["uniswap"],
        "interval": 0,
        "priceAggregator": "median",
        "sourceTimeout": 2000,
        "tokens": {
          "BTC": {
           "source": ["coingecko"]
          },
          "ETH": {}
        }
      }`);

    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });

    await expect(sut.run()).rejects.toThrowError(
      "Could not determine maxPriceDeviationPercent"
    );
  });

  it("should throw if no sourceTimeout", async () => {
    // given
    manifest = JSON.parse(`{
        "defaultSource": ["uniswap"],
        "interval": 0,
        "priceAggregator": "median",
        "maxPriceDeviationPercent": 25,
        "evmChainId": 1,
        "tokens": {
          "BTC": {
           "source": ["coingecko"]
          },
          "ETH": {}
        }
      }`);
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);
    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });

    await expect(sut.run()).rejects.toThrowError("No timeout configured for");
  });

  it("should save 'error' value if fetcher fails", async () => {
    // Given
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);
    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });
    fetchers["coingecko"] = {
      fetchAll: jest.fn(() => {
        throw new Error("test-error-coingecko");
      }),
    };

    // When
    await sut.run();

    // Then
    expect(mockBundlrProxy.prepareSignedTrasaction).toHaveBeenCalledWith([
      {
        id: "00000000-0000-0000-0000-000000000000",
        source: {
          coingecko: "error",
          uniswap: 445,
        },
        symbol: "BTC",
        timestamp: 111111111,
        version: "0.4",
        value: 445,
      },
    ]);
  });

  it("should broadcast fetched and signed prices", async () => {
    // given
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);

    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: {
        ...manifest,
        enableArweaveBackup: false,
      },
    });

    await sut.run();
    expect(mockBundlrProxy.prepareSignedTrasaction).toHaveBeenCalledWith([
      {
        id: "00000000-0000-0000-0000-000000000000",
        source: { coingecko: 444, uniswap: 445 },
        symbol: "BTC",
        timestamp: 111111111,
        value: 444.5,
        version: "0.4",
      },
    ]);

    expect(axios.post).toHaveBeenCalledWith("http://localhost:9000/prices", [
      {
        id: "00000000-0000-0000-0000-000000000000",
        dataPoints: [{ symbol: "BTC", value: 444.5 }],
        permawebTx: "mockBundlrTransactionId",
        provider: "mockArAddress",
        source: { coingecko: 444, uniswap: 445 },
        timestampMilliseconds: 111111111,
        version: "0.4",
        signature:
          "osKzrnqb87XX51p1TDLZAM2KLoIlgf1JK8SC1OnOjCBGOxFpJG4Yjg6eQuvoLMpA1owO0aMQGO7pge+bjY6gxhw=",
        signerAddress:
          "BE81W9y3zAr3KO88zrlhXZBoS7Wyyl+FmrDwtwQHWHGqOFtrG46tgJymdFTZaD/PK6A0Vtb+LEq+Kwfw+9uy8cE=",
      },
    ]);
    expect(axios.post).toHaveBeenCalledWith("http://localhost:9000/packages", {
      timestampMilliseconds: 111111111,
      signerAddress:
        "BE81W9y3zAr3KO88zrlhXZBoS7Wyyl+FmrDwtwQHWHGqOFtrG46tgJymdFTZaD/PK6A0Vtb+LEq+Kwfw+9uy8cE=",
      provider: "mockArAddress",
      dataPoints: [{ symbol: "BTC", value: 444.5 }],
      signature:
        "osKzrnqb87XX51p1TDLZAM2KLoIlgf1JK8SC1OnOjCBGOxFpJG4Yjg6eQuvoLMpA1owO0aMQGO7pge+bjY6gxhw=",
    });
    expect(mockBundlrProxy.uploadBundlrTransaction).not.toHaveBeenCalled();
    // TODO: cannot spy on setInterval after upgrade to jest 27.
    // expect(setInterval).toHaveBeenCalledWith(any(), manifest.interval);
  });

  it("should not broadcast fetched and signed prices if values deviates too much", async () => {
    // given
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);

    manifest = {
      ...manifest,
      maxPriceDeviationPercent: 0,
    };

    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });

    await sut.run();
    expect(mockBundlrProxy.prepareSignedTrasaction).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalledWith("http://localhost:9000", any());
  });

  it("should save transaction on Arweave in mode=PROD", async () => {
    // given
    mockBundlrProxy.getBalance.mockResolvedValue(0.2);

    const sut = await NodeRunner.create({
      ...nodeConfig,
      overrideManifestUsingFile: manifest,
    });

    await sut.run();

    expect(axios.post).toHaveBeenCalledWith("http://localhost:9000/prices", [
      {
        id: "00000000-0000-0000-0000-000000000000",
        dataPoints: [{ symbol: "BTC", value: 444.5 }],
        source: {
          coingecko: 444,
          uniswap: 445,
        },
        timestampMilliseconds: 111111111,
        version: "0.4",
        permawebTx: "mockBundlrTransactionId",
        provider: "mockArAddress",
        signature:
          "osKzrnqb87XX51p1TDLZAM2KLoIlgf1JK8SC1OnOjCBGOxFpJG4Yjg6eQuvoLMpA1owO0aMQGO7pge+bjY6gxhw=",
        signerAddress:
          "BE81W9y3zAr3KO88zrlhXZBoS7Wyyl+FmrDwtwQHWHGqOFtrG46tgJymdFTZaD/PK6A0Vtb+LEq+Kwfw+9uy8cE=",
      },
    ]);

    expect(mockBundlrProxy.uploadBundlrTransaction).toHaveBeenCalledWith({
      id: "mockBundlrTransactionId",
    });
  });

  describe("when overrideManifestUsingFile flag is null", () => {
    let nodeConfigManifestFromAr: any;
    beforeEach(() => {
      nodeConfigManifestFromAr = {
        ...nodeConfig,
        overrideManifestUsingFile: null,
      };
    });

    it("should download prices when manifest is available", async () => {
      // given
      const arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockImplementation(() => Promise.resolve(manifest));

      const sut = await NodeRunner.create(nodeConfigManifestFromAr);

      await sut.run();

      expect(fetchers.uniswap.fetchAll).toHaveBeenCalled();
      expect(mockBundlrProxy.prepareSignedTrasaction).toHaveBeenCalled();

      arServiceSpy.mockClear();
    });

    it("should not create NodeRunner instance until manifest is available", async () => {
      // given
      jest.useRealTimers();
      let arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockImplementation(async () => {
          await timeout(200);
          return Promise.reject("no way!");
        });

      // this effectively makes manifest available after 100ms - so
      // we expect that second manifest fetching trial will succeed.
      setTimeout(() => {
        arServiceSpy = jest
          .spyOn(ArweaveService.prototype, "getCurrentManifest")
          .mockImplementation(() => Promise.resolve(manifest));
      }, 100);
      const sut = await NodeRunner.create(nodeConfigManifestFromAr);
      expect(sut).not.toBeNull();
      expect(ArweaveService.prototype.getCurrentManifest).toHaveBeenCalledTimes(
        2
      );
      arServiceSpy.mockClear();
      jest.useFakeTimers();
    });

    it("should continue working when update manifest fails", async () => {
      // given
      nodeConfigManifestFromAr.manifestRefreshInterval = 0;
      let arServiceSpy = jest
        .spyOn(ArweaveService.prototype, "getCurrentManifest")
        .mockResolvedValueOnce(manifest)
        .mockRejectedValue("timeout");

      const sut = await NodeRunner.create(nodeConfigManifestFromAr);

      await sut.run();

      expect(sut).not.toBeNull();
      expect(ArweaveService.prototype.getCurrentManifest).toHaveBeenCalledTimes(
        2
      );
      expect(fetchers.uniswap.fetchAll).toHaveBeenCalled();
      expect(mockBundlrProxy.prepareSignedTrasaction).toHaveBeenCalled();
      arServiceSpy.mockClear();
    });
  });
});

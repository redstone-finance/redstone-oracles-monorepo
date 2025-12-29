import { DataPackage } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { ethers } from "ethers";
import { DataPackagesRequestParams, requestDataPackages } from "../src";
import { requestRedstonePayload } from "../src/request-redstone-payload";
import { mockSignedDataPackages } from "./mocks/mock-packages";
import { server } from "./mocks/server";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const MOCK_WALLET = new ethers.Wallet(TEST_PRIVATE_KEY);

const getReqParams = (urls?: string[]): DataPackagesRequestParams => {
  return {
    dataPackagesIds: ["BTC", "ETH"],
    dataServiceId: "mock-data-service-tests",
    uniqueSignersCount: 2,
    urls: urls!,
    authorizedSigners: [
      // signer addresses for mock data packages returned by the server
      "0x4fE51A2963a44Cd3DABB05AEe14b9F9A4652fF6b",
      "0x799DFAfc2F6f5d90c3fEdD70ae037DBDaC201668",
      "0x9Cc1aDE00B4BFC67a9E1D222eA6DAF1399c525F1",
      "0x5416Ff1BaCBD144E63705c675Fb6999288E1b27d",
      "0x5501D3042042f567A555bF05C3897Fda57Be2633",
      "0x43c6AF28BBa09EB95534CC853D8887DB0Cda6226",
      "0xe98fF207D73bF34959f05fb671cbcA2431012E02",
      "0x5C48b10B53b968bCfC85a0D1CB040857AA8d9254",
      "0x742d7Da79B0b836C2F095c9d8F7F1A2dc7C81A48",
      "0x5416Ff1BaCBD144E63705c675Fb6999288E1b27d",
    ],
  };
};
const SAMPLE_RESPONSE = {
  data: {
    ETH: [
      {
        dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
        timestampMilliseconds: 1654353400000,
        dataServiceId: "service-1",
        signature:
          "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
        dataFeedId: "ETH",
        dataPackageId: "ETH",
        signerAddress: "0x2",
      },
    ],
  },
};

describe("request-data-packages", () => {
  beforeAll(() => server.listen());
  beforeEach(() => jest.restoreAllMocks());

  test("Should properly request data packages", async () => {
    const dataPackages = await requestDataPackages(getReqParams());
    expect(mockSignedDataPackages.ETH[0]).toMatchObject(dataPackages["ETH"]![0].toObj());
  });

  test("Should properly request redstone payload", async () => {
    const redstonePayload = await requestRedstonePayload(getReqParams());
    expect(redstonePayload).toBe(
      "4254430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001d1a94a200001812f2590c0" +
        "00000020000001357e7277f0acf07cd574d721acce7db8ea12b2dee7f4a2b93aef6903a4b91933344708211a51630344be4957dbf398a98381f35132804c1652a8f5e55a5744" +
        "121c4254430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001d1a94a200001812f25" +
        "90c000000020000001357e7277f0acf07cd574d721acce7db8ea12b2dee7f4a2b93aef6903a4b91933344708211a51630344be4957dbf398a98381f35132804c1652a8f5e55a" +
        "5744121c4554480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000174876e80001812" +
        "f2590c000000020000001357e7277f0acf07cd574d721acce7db8ea12b2dee7f4a2b93aef6903a4b91933344708211a51630344be4957dbf398a98381f35132804c1652a8f5e" +
        "55a5744121c4554480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000174876e800018" +
        "12f2590c000000020000001357e7277f0acf07cd574d721acce7db8ea12b2dee7f4a2b93aef6903a4b91933344708211a51630344be4957dbf398a98381f35132804c1652a8f" +
        "5e55a5744121c0004000000000002ed57011e0000"
    );
  });

  test("Should not fail if not all urls fail", async () => {
    const defaultReqParams = getReqParams([
      "https://bad-url-1.com",
      "https://bad-url-2.com",
      "https://good-url-1.com",
    ]);
    const dataPackages = await requestDataPackages(defaultReqParams);
    expect(mockSignedDataPackages.ETH[0]).toMatchObject(dataPackages["ETH"]![0].toObj());
  });

  test("Should fail if all urls fail", async () => {
    const defaultReqParams = getReqParams(["https://bad-url-1.com", "https://bad-url-2.com"]);
    await expect(requestDataPackages(defaultReqParams)).rejects.toThrow(
      /Request failed with status code 400/
    );
  });

  test("Should fail for missing data feed id", async () => {
    const defaultReqParams = getReqParams(["https://good-url-sorted-asc-only-eth.com"]);
    await expect(() => requestDataPackages(defaultReqParams)).rejects.toThrow(
      "Requested data feed id is not included in response: BTC"
    );
  });

  test("Should fail for too few unique signers", async () => {
    await expect(() =>
      requestDataPackages({
        ...getReqParams(),
        uniqueSignersCount: 5,
      })
    ).rejects.toThrow(
      "Too few data packages with unique signers for the data feed: BTC. Expected: 5. Received: 4"
    );
  });

  test("Should honor skipSignatureVerification param", async () => {
    const dataPackages = (
      await requestDataPackages({
        ...getReqParams(),
        dataPackagesIds: ["ETH"],
        skipSignatureVerification: true,
        authorizedSigners: ["0x1"],
        uniqueSignersCount: 1,
        returnAllPackages: false,
      })
    )["ETH"];
    expect(RedstoneCommon.isDefined(dataPackages));
    expect(dataPackages!.length).toBe(1);
  });

  test("Should get two data packages closest to median", async () => {
    const dataPackages = await requestDataPackages({
      ...getReqParams(),
      dataPackagesIds: ["ETH"],
      returnAllPackages: false,
    });

    expect(dataPackages["ETH"]!.length).toBe(2);
    expect(dataPackages["ETH"]![0].toObj().dataPoints[0].value).toBe(1000);
    expect(dataPackages["ETH"]![1].toObj().dataPoints[0].value).toBe(1000);
  });

  test("Should get single data packages closest to median", async () => {
    const dataPackages = await requestDataPackages({
      ...getReqParams(),
      uniqueSignersCount: 1,
      dataPackagesIds: ["ETH"],
      returnAllPackages: false,
    });

    expect(dataPackages["ETH"]!.length).toBe(1);
    expect(dataPackages["ETH"]![0].toObj().dataPoints[0].value).toBe(1000);
  });

  test("Should get all data packages", async () => {
    const dataPackages = await requestDataPackages({
      ...getReqParams(),
      uniqueSignersCount: 4,
      dataPackagesIds: ["ETH"],
      returnAllPackages: false,
    });

    expect(dataPackages["ETH"]!.length).toBe(4);
    expect(dataPackages["ETH"]![0].toObj().dataPoints[0].value).toBe(1000);
    expect(dataPackages["ETH"]![1].toObj().dataPoints[0].value).toBe(1000);
    expect(dataPackages["ETH"]![2].toObj().dataPoints[0].value).toBe(1002);
    expect(dataPackages["ETH"]![3].toObj().dataPoints[0].value).toBe(990);
  });

  test("Should get the most fresh data-packages", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 1000 }],
            timestampMilliseconds: 1654353400000 + 69,
            signature:
              "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x43c6AF28BBa09EB95534CC853D8887DB0Cda6226",
          },
        ],
      },
    });
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 1000 }],
            timestampMilliseconds: 1654353400000 + 420,
            signature:
              "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0xe98fF207D73bF34959f05fb671cbcA2431012E02",
          },
        ],
      },
    });
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 1000 }],
            timestampMilliseconds: 1654353400000,
            signature:
              "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
          },
        ],
      },
    });

    // signer addresses of the packages
    const signerAddresses = [
      "0xe98fF207D73bF34959f05fb671cbcA2431012E02",
      "0x43c6AF28BBa09EB95534CC853D8887DB0Cda6226",
    ];

    const dataPackages = await requestDataPackages({
      ...getReqParams(),
      authorizedSigners: signerAddresses,
      urls: ["1", "2"],
      uniqueSignersCount: 1,
      dataPackagesIds: ["ETH"],
      returnAllPackages: false,
    });

    expect(dataPackages["ETH"]![0].dataPackage.timestampMilliseconds).toBe(1654353400000 + 420);
  });

  test("Should throw error for different timestamps", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const dataPackage = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
      timestampMilliseconds: 1732724591164,
      dataPackageId: "ETH",
    }).sign(MOCK_WALLET.privateKey);

    axiosGetSpy.mockResolvedValue({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
            timestampMilliseconds: 1732724591163,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x91F4633B969a185FE457d835901FbA7251B45387",
            signature: dataPackage.toObj().signature,
          },
          {
            dataPoints: [{ dataFeedId: "ETH", value: 10000 }],
            timestampMilliseconds: 1732724591165,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x5C48b10B53b968bCfC85a0D1CB040857AA8d9254",
            signature: dataPackage.toObj().signature,
          },
        ],
      },
    });

    // signer addresses of the packages
    const signerAddresses = [
      "0x91F4633B969a185FE457d835901FbA7251B45387",
      "0x5C48b10B53b968bCfC85a0D1CB040857AA8d9254",
    ];

    await expect(
      requestDataPackages({
        ...getReqParams(),
        authorizedSigners: signerAddresses,
        uniqueSignersCount: 2,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
        maxTimestampDeviationMS: 20_000,
      })
    ).rejects.toThrowError(/Timestamps do not have the same value: 1732724591163, 1732724591165/);
  });

  test("Should throw error for deviated timestamp", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const now = 111111100000;
    const dataPackage = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
      timestampMilliseconds: now,
      dataPackageId: "ETH",
    }).sign(MOCK_WALLET.privateKey);

    axiosGetSpy.mockResolvedValue({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
            timestampMilliseconds: now - 30_000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x742d7Da79B0b836C2F095c9d8F7F1A2dc7C81A48",
            signature: dataPackage.toObj().signature,
          },
          {
            dataPoints: [{ dataFeedId: "ETH", value: 10000 }],
            timestampMilliseconds: now - 30_000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x5537b198bB8840E8aD3088E3d732Aa1Be109b8ab",
            signature: dataPackage.toObj().signature,
          },
        ],
      },
    });

    // signer addresses of the packages
    const signerAddresses = [
      "0x742d7Da79B0b836C2F095c9d8F7F1A2dc7C81A48",
      "0x5537b198bB8840E8aD3088E3d732Aa1Be109b8ab",
    ];

    await expect(
      requestDataPackages({
        ...getReqParams(),
        authorizedSigners: signerAddresses,
        uniqueSignersCount: 2,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
        maxTimestampDeviationMS: 20_000,
      })
    ).rejects.toThrowError(/Timestamp deviation exceeded/);
  });

  test("Should throw error for all packages signed by not authorized", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const dataPackage = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
      timestampMilliseconds: 1654353400000,
      dataPackageId: "BTC",
    }).sign(MOCK_WALLET.privateKey);

    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            signature: dataPackage.toObj().signature,
          },
        ],
      },
    });

    await expect(
      requestDataPackages({
        ...getReqParams(),
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
        authorizedSigners: ["fake_signer"],
      })
    ).rejects.toThrowError(/No data packages for the data feed: ETH/);
  });

  test("Should not throw an error if ignoreMissingFeed set", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const dataPackage = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
      timestampMilliseconds: 1654353400000,
      dataPackageId: "BTC",
    }).sign(MOCK_WALLET.privateKey);

    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "ETH", value: 20000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            signature: dataPackage.toObj().signature,
          },
        ],
      },
    });

    const result = await requestDataPackages({
      ...getReqParams(),
      uniqueSignersCount: 1,
      dataPackagesIds: ["BTC"],
      returnAllPackages: false,
      authorizedSigners: [MOCK_WALLET.address],
      ignoreMissingFeed: true,
    });
    expect(result).toMatchObject({});
  });

  test("Should not throw an error if ignoreMissingFeed set - package too old", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const dataPackage = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
      timestampMilliseconds: 1654353400000,
      dataPackageId: "BTC",
    }).sign(MOCK_WALLET.privateKey);

    axiosGetSpy.mockResolvedValueOnce({
      data: {
        BTC: [
          {
            dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            signature: dataPackage.toObj().signature,
          },
        ],
      },
    });

    const result = await requestDataPackages({
      ...getReqParams(),
      uniqueSignersCount: 1,
      dataPackagesIds: ["BTC"],
      returnAllPackages: false,
      authorizedSigners: [MOCK_WALLET.address],
      maxTimestampDeviationMS: 1,
      ignoreMissingFeed: true,
    });
    expect(result).toMatchObject({});
  });

  test("Should omit packages signed by not authorized signers, but pass through correctly signed", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    const signedDataPackageByAuthorizedSigner = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
      timestampMilliseconds: 1654353400000,
      dataPackageId: "BTC",
    }).sign(MOCK_WALLET.privateKey);

    const mockWallet2 = ethers.Wallet.createRandom();
    const signedDataPackageByNOTAuthorizedSigner = DataPackage.fromObj({
      dataPoints: [{ dataFeedId: "BTC", value: 30000 }],
      timestampMilliseconds: 1654353400000,
      dataPackageId: "BTC",
    }).sign(mockWallet2.privateKey);

    axiosGetSpy.mockResolvedValue({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            signature: signedDataPackageByAuthorizedSigner.toObj().signature,
          },
          {
            dataPoints: [{ dataFeedId: "BTC", value: 40000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            // invalid signature should be also rejected
            signature: "0x0",
          },
          {
            dataPoints: [{ dataFeedId: "BTC", value: 30000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
            signature: signedDataPackageByNOTAuthorizedSigner.toObj().signature,
          },
        ],
      },
    });
    const result = await requestDataPackages({
      ...getReqParams(),
      uniqueSignersCount: 1,
      dataPackagesIds: ["ETH"],
      returnAllPackages: false,
      authorizedSigners: [MOCK_WALLET.address],
    });

    expect(result["ETH"]![0].dataPackage.dataPoints[0].toObj().value).toEqual(20_000);

    await expect(
      requestDataPackages({
        ...getReqParams(),
        uniqueSignersCount: 2,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
        authorizedSigners: [MOCK_WALLET.address],
      })
    ).rejects.toThrowError(/Too few data packages with unique signers/);
  });

  test("Should reject when payload does not follow schema", async () => {
    const axiosGetSpy = jest.spyOn(axios, "get");
    // missing signature
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        ETH: [
          {
            dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
            timestampMilliseconds: 1654353400000,
            dataServiceId: "service-1",
            dataFeedId: "ETH",
            dataPackageId: "ETH",
            signerAddress: "0x2",
          },
        ],
      },
    });

    await expect(
      requestDataPackages({
        ...getReqParams(),
        uniqueSignersCount: 4,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      })
    ).rejects.toThrowError(/Zod validation error/);
  });

  describe("requestDataPackages time handling", () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it("three gateways respond immediately with successes", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");
      axiosGetSpy.mockResolvedValue(SAMPLE_RESPONSE);

      const start = performance.now();
      await requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      const timePassed = performance.now() - start;
      expect(timePassed).toBe(0);
    });

    it("two gateways respond immediately with successes one fails immediately", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");
      axiosGetSpy
        .mockRejectedValueOnce(new Error("gw error"))
        .mockResolvedValueOnce(SAMPLE_RESPONSE)
        .mockResolvedValueOnce(SAMPLE_RESPONSE);

      const start = performance.now();
      await requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      const timePassed = performance.now() - start;
      expect(timePassed).toBe(0);
    });

    it("two gateways respond immediately one timeouts", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");
      axiosGetSpy
        .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(reject, 20_000)))
        .mockImplementationOnce(() => Promise.resolve(SAMPLE_RESPONSE))
        .mockImplementationOnce(() => Promise.resolve(SAMPLE_RESPONSE));

      const start = performance.now();
      void jest.advanceTimersByTimeAsync(650);
      await requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      const timePassed = performance.now() - start;
      expect(timePassed).toBe(500);
    });

    it("two gateways timeouts one respond", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");
      axiosGetSpy
        .mockResolvedValueOnce(SAMPLE_RESPONSE)
        .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(reject, 20_000)))
        .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(reject, 20_000)));

      const start = performance.now();
      void jest.advanceTimersByTimeAsync(650);
      await requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      const timePassed = performance.now() - start;
      expect(timePassed).toBe(500);
    });

    it("three gateways timeout", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");
      axiosGetSpy.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000))
      );

      const start = performance.now();
      void jest.advanceTimersByTimeAsync(21_000);
      const packagesPromise = requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      await expect(packagesPromise).rejects.toThrowError(/timeout/);
      const timePassed = performance.now() - start;
      expect(timePassed).toBe(20_000);
    });

    it("two gateways timeout last respond after wait for all gateways", async () => {
      const axiosGetSpy = jest.spyOn(axios, "get");

      axiosGetSpy
        .mockImplementationOnce(
          () => new Promise((resolve, _) => setTimeout(() => resolve(SAMPLE_RESPONSE), 20_000))
        )
        .mockImplementationOnce(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000))
        )
        .mockImplementationOnce(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000))
        );

      const start = performance.now();
      void jest.advanceTimersByTimeAsync(21_000);
      await requestDataPackages({
        ...getReqParams(),
        urls: ["1", "2", "3"],
        uniqueSignersCount: 1,
        dataPackagesIds: ["ETH"],
        returnAllPackages: false,
      });

      const timePassed = performance.now() - start;
      expect(timePassed).toBe(20_000);
    });
  });
});

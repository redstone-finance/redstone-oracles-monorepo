import {
  ContractParamsProvider,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { Contract, Keypair } from "@stellar/stellar-sdk";
import { makeServer, wasmFilePath } from "../scripts/utils";
import {
  makeKeypair,
  StellarContractDeployer,
  StellarPricesContractAdapter,
  StellarRpcClient,
} from "../src";

const DATA_SERVICE_ID = "redstone-primary-prod";
const DEPLOY_CONTRACT_TIMEOUT_MS = 20 * 1_000;
const WRITE_TEST_TIMEOUT_MS = 20 * 1_000;

describe("StellarPricesContractAdapter", () => {
  let adapter: StellarPricesContractAdapter;
  let client: StellarRpcClient;
  let keypair: Keypair;

  let paramsOneFeed: ContractParamsProvider;
  let paramsTwoFeeds: ContractParamsProvider;

  beforeAll(async () => {
    const server = makeServer();
    keypair = makeKeypair();
    client = new StellarRpcClient(server);

    const deployer = new StellarContractDeployer(client, keypair);
    const { contractId: adapterId } = await deployer.deploy(
      wasmFilePath("redstone_adapter")
    );

    adapter = new StellarPricesContractAdapter(
      client,
      new Contract(adapterId),
      keypair
    );

    await adapter.init(keypair.publicKey());
  }, DEPLOY_CONTRACT_TIMEOUT_MS);

  beforeEach(() => {
    paramsOneFeed = new ContractParamsProvider({
      dataServiceId: DATA_SERVICE_ID,
      dataPackagesIds: ["LBTC"],
      uniqueSignersCount: 3,
      authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
    });
    paramsTwoFeeds = new ContractParamsProvider({
      dataServiceId: DATA_SERVICE_ID,
      dataPackagesIds: ["BTC", "ETH"],
      uniqueSignersCount: 3,
      authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
    });
  });

  describe("init", () => {
    it("should not be allowed to be called again", async () => {
      await expect(adapter.init(keypair.publicKey())).rejects.toThrowError();
    });
  });

  describe("changeAdmin", () => {
    it("should allow to change admin of a contract", async () => {
      await adapter.changeAdmin(keypair.publicKey());
    });
  });

  describe("getUniqueSignerThreshold", () => {
    it("should return the unique signer threshold", async () => {
      const result = await adapter.getUniqueSignerThreshold();
      expect(result).toBe(3);
    });
  });

  describe("getPricesFromPayload", () => {
    it("should read prices from payload", async () => {
      const result = await adapter.getPricesFromPayload(paramsOneFeed);
      expect(result.length).toBe(1);
      expect(result[0]).toBeGreaterThan(0);
    });

    it("should read prices with multiple feed IDs", async () => {
      const result = await adapter.getPricesFromPayload(paramsTwoFeeds);

      expect(result.length).toBe(2);

      expect(result[0]).toBeGreaterThan(0);
      expect(result[1]).toBeGreaterThan(0);
      // this would fail if BTC and ETH switch places
      expect(result[0] > result[1]).toBeTruthy();
    });
  });

  describe("writePricesFromPayloadToContract", () => {
    it(
      "should write prices from payload to contract",
      async () => {
        const result =
          await adapter.writePricesFromPayloadToContract(paramsOneFeed);
        await client.waitForTx(result);
      },
      WRITE_TEST_TIMEOUT_MS
    );

    it(
      "should write prices with multiple feed IDs",
      async () => {
        const result =
          await adapter.writePricesFromPayloadToContract(paramsTwoFeeds);
        await client.waitForTx(result);
      },
      WRITE_TEST_TIMEOUT_MS
    );
  });

  describe("readContractData", () => {
    it("should read price data from contract", async () => {
      const result = await adapter.readContractData(["BTC"]);

      expect(Object.values(result).length).toBe(1);

      expect(result["BTC"].lastValue).toBeGreaterThan(0);

      expect(result["BTC"].lastBlockTimestampMS).toBeGreaterThan(0);
      const fullYearBlock = new Date(
        result["BTC"].lastBlockTimestampMS
      ).getFullYear();
      expect(fullYearBlock).toBeGreaterThan(2024);

      expect(result["BTC"].lastDataPackageTimestampMS).toBeGreaterThan(0);
      const fullYearPackage = new Date(
        result["BTC"].lastDataPackageTimestampMS
      ).getFullYear();
      expect(fullYearPackage).toBeGreaterThan(2024);
    });

    it("should read price data with multiple feed IDs", async () => {
      const result = await adapter.readContractData(["BTC", "ETH"]);

      expect(Object.values(result).length).toBe(2);

      expect(result["BTC"].lastValue).toBeGreaterThan(0);
      expect(result["ETH"].lastValue).toBeGreaterThan(0);
      // this would fail if BTC and ETH switch places
      expect(result["BTC"].lastValue > result["ETH"].lastValue).toBeTruthy();

      expect(result["BTC"].lastBlockTimestampMS).toBeGreaterThan(0);
      const fullYearBlock0 = new Date(
        result["BTC"].lastBlockTimestampMS
      ).getFullYear();
      expect(fullYearBlock0).toBeGreaterThan(2024);
      expect(result["ETH"].lastBlockTimestampMS).toBeGreaterThan(0);
      const fullYearBlock1 = new Date(
        result["ETH"].lastBlockTimestampMS
      ).getFullYear();
      expect(fullYearBlock1).toBeGreaterThan(2024);

      expect(result["BTC"].lastDataPackageTimestampMS).toBeGreaterThan(0);
      const fullYearPackage0 = new Date(
        result["BTC"].lastDataPackageTimestampMS
      ).getFullYear();
      expect(fullYearPackage0).toBeGreaterThan(2024);
      expect(result["ETH"].lastDataPackageTimestampMS).toBeGreaterThan(0);
      const fullYearPackage1 = new Date(
        result["ETH"].lastDataPackageTimestampMS
      ).getFullYear();
      expect(fullYearPackage1).toBeGreaterThan(2024);
    });
  });

  describe("readLatestUpdateBlockTimestamp", () => {
    it("should read the latest update block timestamp", async () => {
      const result = await adapter.readLatestUpdateBlockTimestamp("BTC");
      expect(result).toBeGreaterThan(0);
      const fullYear = new Date(result).getFullYear();
      expect(fullYear).toBeGreaterThan(2024);
    });
  });

  describe("readPricesFromContract", () => {
    it("should read prices from contract", async () => {
      const result = await adapter.readPricesFromContract(paramsOneFeed);
      expect(result.length).toBe(1);
      expect(result[0]).toBeGreaterThan(0);
    });

    it("should read prices with multiple feed IDs", async () => {
      const result = await adapter.readPricesFromContract(paramsTwoFeeds);

      expect(result.length).toBe(2);

      expect(result[0]).toBeGreaterThan(0);
      expect(result[1]).toBeGreaterThan(0);
      // this would fail if BTC and ETH switch places
      expect(result[0] > result[1]).toBeTruthy();
    });
  });

  describe("readTimestampFromContract", () => {
    it("should read the latest package timestamp", async () => {
      const result = await adapter.readTimestampFromContract("BTC");
      expect(result).toBeGreaterThan(0);
      const fullYear = new Date(result).getFullYear();
      expect(fullYear).toBeGreaterThan(2024);
    });
  });
});

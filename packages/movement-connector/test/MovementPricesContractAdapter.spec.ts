import {
  AccountAddress,
  createObjectAddress,
  Network,
} from "@aptos-labs/ts-sdk";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import {
  makeAptosVariables,
  MovementNetworkSchema,
  MovementPricesContractAdapter,
  MovementPricesContractConnector,
  MovementViewContractAdapter,
  MovementWriteContractAdapter,
  SEED,
} from "../src";
import { IMovementContractAdapter } from "../src/types";

const DATA_SERVICE_ID = "redstone-primary-prod";
const WRITE_TEST_TIMEOUT = 20 * 1_000; // 20 secs

describe("MovementPricesContractAdapter", () => {
  let priceAdapter: MovementPricesContractAdapter;
  let contractParamsProvider: ContractParamsProvider;
  let movementConnnector: MovementPricesContractConnector;

  beforeAll(() => {
    const network = RedstoneCommon.getFromEnv("NETWORK", MovementNetworkSchema);
    const packageAddress = RedstoneCommon.getFromEnv(
      "PACKAGE_ADDRESS",
      z.optional(z.string())
    );
    const privateKey = RedstoneCommon.getFromEnv(
      "PRIVATE_KEY",
      z.optional(z.string())
    );
    const aptosVariables = makeAptosVariables(
      network as Network,
      packageAddress,
      privateKey
    );
    const priceAdapterObjectAddress: AccountAddress = createObjectAddress(
      aptosVariables.account.accountAddress,
      SEED
    );

    const contractAdapter: IMovementContractAdapter = {
      writer: new MovementWriteContractAdapter(
        aptosVariables.client,
        aptosVariables.account,
        aptosVariables.packageObjectAddress,
        priceAdapterObjectAddress
      ),
      viewer: new MovementViewContractAdapter(
        aptosVariables.client,
        aptosVariables.packageObjectAddress,
        priceAdapterObjectAddress
      ),
    };

    priceAdapter = new MovementPricesContractAdapter(contractAdapter);

    movementConnnector = new MovementPricesContractConnector(
      aptosVariables.client,
      aptosVariables.account,
      aptosVariables.packageObjectAddress
    );
  });

  beforeEach(() => {
    contractParamsProvider = new ContractParamsProvider({
      dataServiceId: DATA_SERVICE_ID,
      dataPackagesIds: ["LBTC"],
      uniqueSignersCount: 3,
    });
  });

  describe("getUniqueSignerThreshold", () => {
    it("should return the unique signer threshold", async () => {
      const result = await priceAdapter.getUniqueSignerThreshold();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(8);
    });
  });

  describe("writePricesFromPayloadToContract", () => {
    it(
      "should write prices from payload to contract",
      async () => {
        const digest = await priceAdapter.writePricesFromPayloadToContract(
          contractParamsProvider
        );
        expect(typeof digest).toBe("string");
        expect(digest.length).toBeGreaterThanOrEqual(0);
        const success = await movementConnnector.waitForTransaction(digest);
        expect(success).toBeTruthy();
      },
      WRITE_TEST_TIMEOUT
    );

    it(
      "should write prices with multiple feed IDs",
      async () => {
        contractParamsProvider = new ContractParamsProvider({
          dataServiceId: DATA_SERVICE_ID,
          dataPackagesIds: ["ETH", "BTC"],
          uniqueSignersCount: 1,
        });

        const digest = await priceAdapter.writePricesFromPayloadToContract(
          contractParamsProvider
        );
        expect(typeof digest).toBe("string");
        expect(digest.length).toBeGreaterThanOrEqual(0);
        const success = await movementConnnector.waitForTransaction(digest);
        expect(success).toBeTruthy();
      },
      WRITE_TEST_TIMEOUT
    );
  });

  describe("readLatestUpdateBlockTimestamp", () => {
    it("should read the latest update block timestamp", async () => {
      const result = await priceAdapter.readLatestUpdateBlockTimestamp("ETH");
      expect(result).toBeGreaterThanOrEqual(0);
      const fullYear = new Date(result).getFullYear();
      expect(fullYear).toBeGreaterThan(2024);
    });
  });

  describe("readPricesFromContract", () => {
    it("should read prices from contract", async () => {
      const result = await priceAdapter.readPricesFromContract(
        contractParamsProvider
      );
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0] === "bigint");
    });

    it("should read prices with multiple feed IDs", async () => {
      contractParamsProvider = new ContractParamsProvider({
        dataServiceId: DATA_SERVICE_ID,
        dataPackagesIds: ["LBTC", "ETH", "BTC"],
        uniqueSignersCount: 1,
      });

      const result = await priceAdapter.readPricesFromContract(
        contractParamsProvider
      );

      expect(result.length).toBe(3);
      result.forEach((price) => {
        expect(typeof price === "bigint");
      });

      // this would fail if ETH flipped BTC
      expect(result[1] < result[2]).toBeTruthy();
    });
  });
});

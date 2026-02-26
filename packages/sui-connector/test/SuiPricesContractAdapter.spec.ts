import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import "dotenv/config";
import {
  makeSuiClient,
  makeSuiJsonRpcClient,
  makeSuiKeypair,
  readSuiConfig,
  SuiNetworkSchema,
  SuiWriteContractAdapter,
} from "../src";
import { GrpcSuiClient } from "../src/GrpcSuiClient";
import { LegacyJsonRpcClient } from "../src/LegacyClient";
import { SuiClient } from "../src/SuiClient";
import { SuiContractUpdater } from "../src/SuiContractUpdater";

const DATA_SERVICE_ID = "redstone-primary-prod";
const WRITE_TEST_TIMEOUT = RedstoneCommon.secsToMs(40);

const makeClients: Record<string, () => SuiClient> = {
  grpc: () => {
    execSync("yarn deploy", {
      stdio: ["inherit", "inherit", "inherit"],
    });
    const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
    return new GrpcSuiClient(makeSuiClient(network));
  },
  legacy: () => {
    execSync("yarn deploy", {
      stdio: ["inherit", "inherit", "inherit"],
    });
    const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
    return new LegacyJsonRpcClient(makeSuiJsonRpcClient(network));
  },
};

for (const [name, makeClient] of Object.entries(makeClients)) {
  describe(`SuiPricesContractAdapter [${name}]`, () => {
    let adapter: SuiWriteContractAdapter;
    let contractParamsProvider: ContractParamsProvider;
    let client: SuiClient;

    beforeAll(() => {
      const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
      const config = readSuiConfig(network);
      client = makeClient();

      const keypair = makeSuiKeypair();

      adapter = new SuiWriteContractAdapter(
        client,
        new SuiContractUpdater(client, keypair, {
          ...config,
          expectedTxDeliveryTimeInMs: 11000000,
        }),
        config
      );
    }, WRITE_TEST_TIMEOUT);

    beforeEach(() => {
      contractParamsProvider = new ContractParamsProvider({
        dataServiceId: DATA_SERVICE_ID,
        dataPackagesIds: ["LBTC"],
        uniqueSignersCount: 3,
        authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
      });
    });

    describe("getUniqueSignerThreshold", () => {
      it("should return the unique signer threshold", async () => {
        const result = await adapter.getUniqueSignerThreshold();
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(8);
      });
    });

    describe.skip("getPricesFromPayload", () => {});

    describe.skip("readTimestampFromContract", () => {});

    describe("writePricesFromPayloadToContract", () => {
      it(
        "should write prices from payload to contract",
        async () => {
          const result = await adapter.writePricesFromPayloadToContract(contractParamsProvider);
          await checkResult(result);
        },
        WRITE_TEST_TIMEOUT
      );

      it(
        "should write prices with multiple feed IDs",
        async () => {
          contractParamsProvider = new ContractParamsProvider({
            dataServiceId: DATA_SERVICE_ID,
            dataPackagesIds: ["ETH", "BTC"],
            uniqueSignersCount: 3,
            authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
          });

          const result = await adapter.writePricesFromPayloadToContract(contractParamsProvider);
          await checkResult(result);
        },
        WRITE_TEST_TIMEOUT
      );
    });

    describe("readLatestUpdateBlockTimestamp", () => {
      it("should read the latest update block timestamp", async () => {
        const result = await adapter.readLatestUpdateBlockTimestamp("ETH");
        expect(result).toBeGreaterThanOrEqual(0);
        const fullYear = new Date(result).getFullYear();
        expect(fullYear).toBeGreaterThan(2024);
      });
    });

    describe("readPricesFromContract", () => {
      it("should read prices from contract", async () => {
        const result = await adapter.readPricesFromContract(contractParamsProvider);
        expect(result.length).toBeGreaterThan(0);
        expect(typeof result[0] === "bigint");
      });

      it("should read prices with multiple feed IDs", async () => {
        contractParamsProvider = new ContractParamsProvider({
          dataServiceId: DATA_SERVICE_ID,
          dataPackagesIds: ["LBTC", "ETH", "BTC"],
          uniqueSignersCount: 3,
          authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
        });

        const result = await adapter.readPricesFromContract(contractParamsProvider);

        expect(result.length).toBe(3);
        result.forEach((price) => {
          expect(typeof price === "bigint");
        });

        expect(result[1] < result[2]).toBeTruthy();
      });
    });

    async function checkResult(result: string) {
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThanOrEqual(0);
      const success = await client.waitForTransaction(result);
      expect(success).toBe(true);
    }
  });
}

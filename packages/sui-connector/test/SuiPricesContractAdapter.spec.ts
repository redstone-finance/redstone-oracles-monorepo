import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import "dotenv/config";
import {
  makeSuiClient,
  makeSuiJsonRpcClient,
  makeSuiKeypair,
  readSuiConfig,
  SuiClient,
  SuiNetworkSchema,
  SuiWriteContractAdapter,
} from "../src";
import { GrpcSuiClient } from "../src/client/GrpcSuiClient";
import { LegacySuiClient } from "../src/client/LegacySuiClient";

const DATA_SERVICE_ID = "redstone-primary-prod";
const WRITE_TEST_TIMEOUT = RedstoneCommon.secsToMs(40);

const makeClients: Record<string, () => SuiClient> = {
  grpc: () => {
    const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
    execSync("yarn deploy", {
      stdio: ["inherit", "inherit", "inherit"],
    });

    return new GrpcSuiClient(makeSuiClient(network));
  },
  legacy: () => {
    const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
    execSync("yarn deploy", {
      stdio: ["inherit", "inherit", "inherit"],
    });

    return new LegacySuiClient(makeSuiJsonRpcClient(network));
  },
};

for (const [name, makeClient] of Object.entries(makeClients)) {
  describe(`SuiPricesContractAdapter [${name}]`, () => {
    let adapter: SuiWriteContractAdapter;
    let contractParamsProvider: ContractParamsProvider;
    let client: SuiClient;

    beforeAll(() => {
      const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
      client = makeClient();
      const config = readSuiConfig(network);

      const keypair = makeSuiKeypair();
      SuiWriteContractAdapter.contractUpdaterCache = new Map();
      adapter = new SuiWriteContractAdapter(client, keypair, config);
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

    describe("readContractData", () => {
      it("should read prices, timestamps and block timestamps for multiple feed IDs", async () => {
        const feedIds = ["LBTC", "ETH", "BTC"];
        contractParamsProvider = new ContractParamsProvider({
          dataServiceId: DATA_SERVICE_ID,
          dataPackagesIds: feedIds,
          uniqueSignersCount: 3,
          authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
        });

        const result = await adapter.readContractData(feedIds);

        expect(Object.keys(result).length).toBe(feedIds.length);
        for (const feed of feedIds) {
          expect(typeof result[feed].lastValue).toBe("bigint");
          expect(new Date(result[feed].lastBlockTimestampMS).getFullYear()).toBeGreaterThan(2024);
        }
        expect(result["ETH"].lastValue < result["BTC"].lastValue).toBeTruthy();
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

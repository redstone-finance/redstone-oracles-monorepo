// NOTE: tests in this file depend on the order in which they are performed,
//       therefore shall be run sequentially with `-runInBand` flag.

import { Aptos, Network } from "@aptos-labs/ts-sdk";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { PRICE_ADAPTER } from "../scripts/contract-name-enum";
import { readObjectAddress } from "../scripts/deploy-utils";
import { makeAptos } from "../scripts/utils";
import { makeAptosAccount, MoveClient, MovePricesContractAdapter } from "../src";
import { FAKE_PRIVKEY_SECP256K1, NETWORK, REST_NODE_LOCALNET_URL } from "./helpers";

const TEST_FILE_TIMEOUT = 60_000;
const WRITE_TEST_TIMEOUT = 20_000;
const WAIT_TS = 5_000;
const HOUR_MS = 3_600_000;
const DATA_SERVICE_ID = "redstone-primary-prod";
const FEED_BTC = "BTC";
const FEED_ETH = "ETH";
const DATA_PACKAGES_IDS = [FEED_ETH, FEED_BTC];
const SIGNERS_COUNT = 3;

jest.setTimeout(TEST_FILE_TIMEOUT);

describe("MovePricesContractAdapter", () => {
  let priceAdapter: MovePricesContractAdapter;
  let contractParamsProviderMultiple: ContractParamsProvider;
  let aptos: Aptos;
  let test_start_ts: number;

  beforeAll(() => {
    test_start_ts = Date.now();
    aptos = makeAptos(NETWORK as Network, REST_NODE_LOCALNET_URL);
    const { contractAddress, objectAddress } = readObjectAddress(PRICE_ADAPTER, NETWORK);
    const account = makeAptosAccount(FAKE_PRIVKEY_SECP256K1);
    const packageObjectAddress = contractAddress.toString();
    const priceAdapterObjectAddress = objectAddress!.toString();
    priceAdapter = MovePricesContractAdapter.create(
      new MoveClient(aptos),
      { packageObjectAddress, priceAdapterObjectAddress },
      account
    );
  });

  describe("getUniqueSignerThreshold", () => {
    it("should return the unique signer threshold", async () => {
      const result = await priceAdapter.getUniqueSignerThreshold();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(8);
    });
  });

  describe("writePricesFromPayloadToContract", () => {
    beforeEach(() => {
      contractParamsProviderMultiple = new ContractParamsProvider({
        dataServiceId: DATA_SERVICE_ID,
        dataPackagesIds: DATA_PACKAGES_IDS,
        uniqueSignersCount: SIGNERS_COUNT,
        authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
      });
    });

    it(
      "should write prices with multiple feed IDs",
      async () => {
        await RedstoneCommon.sleep(WAIT_TS);
        const digest = await priceAdapter.writePricesFromPayloadToContract(
          contractParamsProviderMultiple
        );
        await checkResult(digest);
      },
      WRITE_TEST_TIMEOUT
    );
  });

  describe("readContractData", () => {
    beforeEach(() => {
      contractParamsProviderMultiple = new ContractParamsProvider({
        dataServiceId: DATA_SERVICE_ID,
        dataPackagesIds: DATA_PACKAGES_IDS,
        uniqueSignersCount: SIGNERS_COUNT,
        authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
      });
    });

    it("should return prices, timestamps and block timestamps for multiple feed IDs", async () => {
      const result = await priceAdapter.readContractData(
        contractParamsProviderMultiple.getDataFeedIds()
      );

      expect(Object.keys(result).length).toBe(DATA_PACKAGES_IDS.length);
      for (const feed of DATA_PACKAGES_IDS) {
        expect(typeof result[feed].lastValue).toBe("bigint");
        expect(result[feed].lastDataPackageTimestampMS).toBeGreaterThan(test_start_ts - HOUR_MS);
        expect(result[feed].lastBlockTimestampMS).toBeGreaterThan(test_start_ts - HOUR_MS);
      }

      // this would fail if ETH flipped BTC
      expect(result[FEED_ETH].lastValue < result[FEED_BTC].lastValue).toBeTruthy();
    });
  });

  async function checkResult(result: string) {
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThanOrEqual(0);
    await RedstoneCommon.sleep(WAIT_TS);
    const receipt = await aptos.waitForTransaction({
      transactionHash: result,
    });
    expect(receipt.hash).toBe(result);
    const status = receipt.success;
    expect(status).toBeTruthy();
  }
});

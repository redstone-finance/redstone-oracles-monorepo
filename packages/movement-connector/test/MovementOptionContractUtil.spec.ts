import { Aptos, Network } from "@aptos-labs/ts-sdk";
import { makeAptos } from "../scripts/utils";
import { DEFAULT_BROADCAST_BUCKETS, TRANSACTION_DEFAULT_CONFIG } from "../src";
import { MovementOptionsContractUtil } from "../src/MovementOptionsContractUtil";
import { NETWORK, REST_NODE_LOCALNET_URL } from "./helpers";

const TEST_DEFAULT_LOCALNET_MOVE_PRICE = 100;
const TEST_DEFAULT_LOCALNET_GAS_BUDGET = 100_000;

describe("MovementOptionContractUtil", () => {
  let aptos: Aptos;

  beforeAll(() => {
    aptos = makeAptos(NETWORK as Network, REST_NODE_LOCALNET_URL);
  });

  describe("prepareTransactionOptions", () => {
    it("should prepare transaction option for default settings with required parameters", async () => {
      const options =
        await MovementOptionsContractUtil.prepareTransactionOptions(
          aptos,
          TRANSACTION_DEFAULT_CONFIG.writePriceOctasTxGasBudget
        );

      expect(options.gasUnitPrice).toBeGreaterThanOrEqual(
        TEST_DEFAULT_LOCALNET_MOVE_PRICE
      );
      if (options.gasUnitPrice) {
        expect(options.maxGasAmount).toEqual(
          Math.floor(
            TRANSACTION_DEFAULT_CONFIG.writePriceOctasTxGasBudget /
              options.gasUnitPrice
          )
        );
      }
    });

    describe("prepareTransactionOptions", () => {
      it("should prepare transaction option for default settings skipping accountSequanceNumber and expireTimestamp parameters", async () => {
        const options =
          await MovementOptionsContractUtil.prepareTransactionOptions(
            aptos,
            TRANSACTION_DEFAULT_CONFIG.writePriceOctasTxGasBudget
          );

        expect(options.accountSequenceNumber).toBeUndefined();
        expect(options.expireTimestamp).toBeUndefined();
      });
    });

    it("should prepare transaction options for specific settings for multiple iterations", async () => {
      for (
        let iteration = 0;
        iteration < DEFAULT_BROADCAST_BUCKETS.length;
        iteration++
      ) {
        const options =
          await MovementOptionsContractUtil.prepareTransactionOptions(
            aptos,
            TEST_DEFAULT_LOCALNET_GAS_BUDGET,
            iteration
          );

        expect(options.accountSequenceNumber).toBeUndefined();
        expect(options.expireTimestamp).toBeUndefined();
        expect(options.gasUnitPrice).toBeGreaterThanOrEqual(
          iteration === 0
            ? TEST_DEFAULT_LOCALNET_MOVE_PRICE
            : DEFAULT_BROADCAST_BUCKETS[iteration]
        );
        if (options.gasUnitPrice) {
          expect(options.maxGasAmount).toEqual(
            Math.floor(TEST_DEFAULT_LOCALNET_GAS_BUDGET / options.gasUnitPrice)
          );
        }
      }
    });

    test("should fail to prepare transaction options for specific settings for iteration exhausting prioritization buckets size", async () => {
      await expect(() =>
        MovementOptionsContractUtil.prepareTransactionOptions(
          aptos,
          TEST_DEFAULT_LOCALNET_GAS_BUDGET,
          DEFAULT_BROADCAST_BUCKETS.length
        )
      ).rejects.toThrowError("Failed to compute gas price");
    });
  });
});

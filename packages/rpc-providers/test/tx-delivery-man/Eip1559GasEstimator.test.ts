import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import Sinon from "sinon";
import {
  DEFAULT_TX_DELIVERY_OPTS,
  RewardsPerBlockAggregationAlgorithm,
  TxDeliveryOpts,
  type Eip1559Fee,
} from "../../src";
import { Eip1559GasEstimator } from "../../src/tx-delivery-man/Eip1559GasEstimator";
import { HardhatProviderMocker } from "../helpers";

describe("Eip1559GasEstimator", () => {
  describe("scaleFees", () => {
    it("should scale according to attempt", () => {
      const opts = {
        ...DEFAULT_TX_DELIVERY_OPTS,
        multiplier: 2,
      } as unknown as Required<TxDeliveryOpts>;
      const scaler = new Eip1559GasEstimator(opts);

      const inputFees: Eip1559Fee = {
        maxFeePerGas: 3,
        maxPriorityFeePerGas: 2,
      };

      expect(scaler.scaleFees(inputFees, 1)).to.deep.equal({
        maxFeePerGas: 5,
        maxPriorityFeePerGas: 4,
      });

      expect(scaler.scaleFees(inputFees, 4)).to.deep.equal({
        maxFeePerGas: 3 + (2 * 2 ** 4 - 2),
        maxPriorityFeePerGas: 2 * 2 ** 4,
      });

      expect(
        scaler.scaleFees(
          {
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
          },
          4
        )
      ).to.deep.equal({
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
      });
    });

    it("should scale for 2d", () => {
      const opts = {
        ...DEFAULT_TX_DELIVERY_OPTS,
        twoDimensionalFees: true,
        multiplier: 2,
        gasLimitMultiplier: 2,
      } as unknown as Required<TxDeliveryOpts>;
      const scaler = new Eip1559GasEstimator(opts);

      expect(
        scaler.scaleFees(
          {
            maxFeePerGas: 0.1e9,
            maxPriorityFeePerGas: 0,
          },
          1
        )
      ).to.deep.equal({
        maxFeePerGas: 0.1e9,
        maxPriorityFeePerGas: 0,
      });

      expect(
        scaler.scaleFees(
          {
            maxFeePerGas: 0.1e9,
            maxPriorityFeePerGas: 0,
          },
          5
        )
      ).to.deep.equal({
        maxFeePerGas: 0.1e9,
        maxPriorityFeePerGas: 0,
      });
    });
  });

  describe("getFees", () => {
    it("should use max aggregation", async () => {
      const opts = {
        ...DEFAULT_TX_DELIVERY_OPTS,
        logger: () => undefined,
      } as unknown as Required<TxDeliveryOpts>;
      const estimator = new Eip1559GasEstimator(opts);

      const providerMock = new HardhatProviderMocker(hardhat.ethers.provider, {
        getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(100) }),
        send: Sinon.stub().callsFake((method: string) => {
          if (method === "eth_feeHistory") {
            return { reward: [["0x1", "0x5"], ["0x3"]] };
          }
          throw new Error(`Unexpected method: ${method}`);
        }),
      });

      const fees = await estimator.getFees(providerMock.provider);

      expect(fees).to.deep.equal({
        maxFeePerGas: 200 + 5,
        maxPriorityFeePerGas: 5,
      });
    });

    it("should use median aggregation", async () => {
      const opts = {
        ...DEFAULT_TX_DELIVERY_OPTS,
        rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm.Median,
        logger: () => undefined,
      } as unknown as Required<TxDeliveryOpts>;
      const estimator = new Eip1559GasEstimator(opts);

      const providerMock = new HardhatProviderMocker(hardhat.ethers.provider, {
        getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(100) }),
        send: Sinon.stub().callsFake((method: string) => {
          if (method === "eth_feeHistory") {
            return { reward: [["0x1", "0x5"], ["0x3"]] };
          }
          throw new Error(`Unexpected method: ${method}`);
        }),
      });

      const fees = await estimator.getFees(providerMock.provider);

      expect(fees).to.deep.equal({
        maxFeePerGas: 200 + 3,
        maxPriorityFeePerGas: 3,
      });
    });
  });
});

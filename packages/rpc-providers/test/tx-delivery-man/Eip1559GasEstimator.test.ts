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
import { Eip1559GasEstimatorV2 } from "../../src/tx-delivery-man/Eip1559GasEstimatorV2";
import {
  HardhatProviderMocker,
  createBasicProviderMock,
  createEip1559Estimator,
  createFallbackProviderMock,
  createPercentileCaptureProviderMock,
} from "../helpers";

describe("Eip1559GasEstimatorV2", () => {
  describe("scaleFees", () => {
    it("should scale fees according to percentile configuration and multiplier", () => {
      const scenarios = [
        {
          name: "multiple percentiles - late scaling",
          percentiles: [25, 50, 75, 90, 99],
          multiplier: 1.5,
          baseFee: { maxFeePerGas: 1000, maxPriorityFeePerGas: 100 },
          testAttempts: [
            { attempt: 0, expectedPriority: 100, expectedMax: 1000 }, // No scaling yet
            { attempt: 4, expectedPriority: 100, expectedMax: 1000 }, // Still no scaling
            { attempt: 5, expectedPriority: 150, expectedMax: 1050 }, // 100 * 1.5^1
            { attempt: 7, expectedPriority: 338, expectedMax: 1238 }, // 100 * 1.5^3
            { attempt: 10, expectedPriority: 1139, expectedMax: 2039 }, // 100 * 1.5^6
          ],
        },
        {
          name: "single percentile - immediate scaling",
          percentiles: 50,
          multiplier: 1.4,
          baseFee: { maxFeePerGas: 1000, maxPriorityFeePerGas: 100 },
          testAttempts: [
            { attempt: 0, expectedPriority: 100, expectedMax: 1000 }, // 100 * 1.4^0
            { attempt: 1, expectedPriority: 140, expectedMax: 1040 }, // 100 * 1.4^1
            { attempt: 3, expectedPriority: 274, expectedMax: 1174 }, // 100 * 1.4^3
            { attempt: 6, expectedPriority: 753, expectedMax: 1653 }, // 100 * 1.4^6
            { attempt: 8, expectedPriority: 1476, expectedMax: 2376 }, // 100 * 1.4^8
          ],
        },
        {
          name: "two percentiles - mixed behavior",
          percentiles: [60, 95],
          multiplier: 1.3,
          baseFee: { maxFeePerGas: 500, maxPriorityFeePerGas: 50 },
          testAttempts: [
            { attempt: 0, expectedPriority: 50, expectedMax: 500 }, // No scaling
            { attempt: 1, expectedPriority: 50, expectedMax: 500 }, // Still no scaling
            { attempt: 2, expectedPriority: 65, expectedMax: 515 }, // 50 * 1.3^1
            { attempt: 4, expectedPriority: 110, expectedMax: 560 }, // 50 * 1.3^3 = 109.85 -> 110
          ],
        },
        {
          name: "high multiplier with small fees",
          percentiles: 75,
          multiplier: 2,
          baseFee: { maxFeePerGas: 3, maxPriorityFeePerGas: 2 },
          testAttempts: [
            { attempt: 0, expectedPriority: 2, expectedMax: 3 }, // No scaling
            { attempt: 1, expectedPriority: 4, expectedMax: 5 }, // 2 * 2^1
            { attempt: 4, expectedPriority: 32, expectedMax: 33 }, // 2 * 2^4
          ],
        },
      ];

      scenarios.forEach((scenario) => {
        scenario.testAttempts.forEach(({ attempt, expectedPriority, expectedMax }) => {
          const estimator = createEip1559Estimator({
            percentileOfPriorityFee: scenario.percentiles,
            multiplier: scenario.multiplier,
          });
          const scaled = estimator.scaleFees(scenario.baseFee as Eip1559Fee, attempt);

          expect(scaled.maxPriorityFeePerGas).to.equal(
            expectedPriority,
            `${scenario.name}: attempt ${attempt} priority`
          );
          expect(scaled.maxFeePerGas).to.equal(
            expectedMax,
            `${scenario.name}: attempt ${attempt} maxFee`
          );
        });
      });
    });

    describe("zero fees edge case", () => {
      it("should handle zero fees correctly", () => {
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 2,
        });

        const zeroFees: Eip1559Fee = {
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
        };

        const scaled = estimator.scaleFees(zeroFees, 5);
        expect(scaled.maxPriorityFeePerGas).to.equal(0);
        expect(scaled.maxFeePerGas).to.equal(0);
      });
    });

    describe("anti-underprice protection", () => {
      it("should enforce 1% minimum increase when network fees drop", () => {
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 1.1,
        });

        // First attempt with high fees: 500 * 1.1^1 = 550
        const firstScaled = estimator.scaleFees(
          { maxFeePerGas: 1000, maxPriorityFeePerGas: 500 },
          1
        );
        expect(firstScaled.maxPriorityFeePerGas).to.equal(550);
        expect(firstScaled.maxFeePerGas).to.equal(1050); // 1000 + (550 - 500)

        // Second attempt with lower network fees - should be bumped to 1% above previous
        // Without protection: 50 * 1.1^1 = 55
        // With protection: ceil(550 * 1.01) = 556
        const secondScaled = estimator.scaleFees(
          { maxFeePerGas: 100, maxPriorityFeePerGas: 50 },
          1
        );

        expect(secondScaled.maxPriorityFeePerGas).to.equal(556); // Bumped from 55 to 556
        expect(secondScaled.maxFeePerGas).to.equal(1061); // ceil(1050 * 1.01)
      });

      it("should log bump message when anti-underprice protection activates", () => {
        const logs: string[] = [];
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 1.1,
          logger: (msg: string) => logs.push(msg),
        });

        estimator.scaleFees({ maxFeePerGas: 1000, maxPriorityFeePerGas: 500 }, 1);
        estimator.scaleFees({ maxFeePerGas: 100, maxPriorityFeePerGas: 50 }, 1);

        expect(logs.some((log) => log.includes("smaller than previous fee bumped by 1%"))).to.be
          .true;
      });

      it("should NOT log bump message when fees naturally increase", () => {
        const logs: string[] = [];
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 2,
          logger: (msg: string) => logs.push(msg),
        });

        estimator.scaleFees({ maxFeePerGas: 1000, maxPriorityFeePerGas: 100 }, 1);
        estimator.scaleFees({ maxFeePerGas: 1000, maxPriorityFeePerGas: 100 }, 2);

        // No bump should occur since fees naturally increase (100*2^1=200, 100*2^2=400)
        expect(logs.some((log) => log.includes("smaller than previous fee bumped by 1%"))).to.be
          .false;
      });

      it("should reset previousFee when attempt is 0 to prevent stale values across transactions", () => {
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 1.1,
        });

        const firstTxAttempt1 = estimator.scaleFees(
          { maxFeePerGas: 1000, maxPriorityFeePerGas: 500 },
          1
        );
        expect(firstTxAttempt1.maxPriorityFeePerGas).to.equal(550);
        expect(firstTxAttempt1.maxFeePerGas).to.equal(1050);

        const firstTxAttempt2 = estimator.scaleFees(
          { maxFeePerGas: 1000, maxPriorityFeePerGas: 500 },
          2
        );
        expect(firstTxAttempt2.maxPriorityFeePerGas).to.equal(605);
        expect(firstTxAttempt2.maxFeePerGas).to.equal(1105);

        const secondTxAttempt0 = estimator.scaleFees(
          { maxFeePerGas: 800, maxPriorityFeePerGas: 200 },
          0
        );
        expect(secondTxAttempt0.maxPriorityFeePerGas).to.equal(200);
        expect(secondTxAttempt0.maxFeePerGas).to.equal(800);

        const secondTxAttempt1 = estimator.scaleFees(
          { maxFeePerGas: 800, maxPriorityFeePerGas: 200 },
          1
        );
        expect(secondTxAttempt1.maxPriorityFeePerGas).to.equal(220);
        expect(secondTxAttempt1.maxFeePerGas).to.equal(820);
      });
    });

    describe("logging", () => {
      it("should log scaling details with correct multiplier for single percentile", () => {
        const logs: string[] = [];
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: 50,
          multiplier: 1.5,
          logger: (msg: string) => logs.push(msg),
        });

        estimator.scaleFees({ maxFeePerGas: 1000, maxPriorityFeePerGas: 100 }, 2);

        expect(logs.length).to.equal(1);
        expect(logs[0]).to.include("multiplier=2.25"); // 1.5^2
        expect(logs[0]).to.include("maxFeePerGas=1125");
        expect(logs[0]).to.include("maxPriorityFeePerGas=225");
      });

      it("should log scaling details with multiplier=1 for multiple percentiles before exhaustion", () => {
        const logs: string[] = [];
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: [25, 50, 75],
          multiplier: 2,
          logger: (msg: string) => logs.push(msg),
        });

        estimator.scaleFees({ maxFeePerGas: 1000, maxPriorityFeePerGas: 100 }, 1);

        expect(logs[0]).to.include("multiplier=1"); // 2^0 = 1
      });
    });
  });

  describe("getFees", () => {
    describe("fee calculation with base fee scaling and aggregation", () => {
      it("should calculate fees with BASE_FEE_SCALER (2x) and different aggregation algorithms", async () => {
        const testCases = [
          {
            name: "MAX aggregation with moderate values",
            baseFee: 150,
            rewards: [["0x10", "0x28"], ["0x1E"]], // [16, 40, 30]
            aggregation: RewardsPerBlockAggregationAlgorithm.Max,
            expectedPriority: 40, // max([16, 40, 30])
            expectedMax: 340, // 150*2 + 40
          },
          {
            name: "MEDIAN aggregation with varied values",
            baseFee: 300,
            rewards: [["0x5", "0x32"], ["0x14"]], // [5, 50, 20]
            aggregation: RewardsPerBlockAggregationAlgorithm.Median,
            expectedPriority: 20, // median([5, 50, 20]) = ceil(20)
            expectedMax: 620, // 300*2 + 20
          },
          {
            name: "MAX aggregation with low values",
            baseFee: 89,
            rewards: [["0x7"]], // [7]
            aggregation: RewardsPerBlockAggregationAlgorithm.Max,
            expectedPriority: 7,
            expectedMax: 185, // 89*2 + 7
          },
          {
            name: "MEDIAN aggregation with high baseFee",
            baseFee: 450,
            rewards: [["0xA", "0x64"], ["0x32"]], // [10, 100, 50]
            aggregation: RewardsPerBlockAggregationAlgorithm.Median,
            expectedPriority: 50, // median([10, 100, 50]) = ceil(50)
            expectedMax: 950, // 450*2 + 50
          },
        ];

        for (const testCase of testCases) {
          const estimator = createEip1559Estimator({
            rewardsPerBlockAggregationAlgorithm: testCase.aggregation,
          });

          const providerMock = createBasicProviderMock(
            testCase.baseFee,
            testCase.rewards[0][0] // Using simplified mock, just pass first reward
          );

          // Override send to support multiple rewards for aggregation tests
          providerMock.toMock.send = Sinon.stub().callsFake((method: string) => {
            if (method === "eth_feeHistory") {
              return { reward: testCase.rewards };
            }
            throw new Error(`Unexpected method: ${method}`);
          });

          const fees = await estimator.getFees(providerMock.provider);

          expect(fees.maxPriorityFeePerGas).to.equal(
            testCase.expectedPriority,
            `${testCase.name}: priority fee mismatch`
          );
          expect(fees.maxFeePerGas).to.equal(
            testCase.expectedMax,
            `${testCase.name}: max fee should be baseFee*2 + priority`
          );
        }
      });

      it("should throw error for unsupported aggregation algorithm", async () => {
        const estimator = createEip1559Estimator({
          rewardsPerBlockAggregationAlgorithm: "INVALID" as RewardsPerBlockAggregationAlgorithm,
        });

        const providerMock = createBasicProviderMock(100, "0x5");

        await expect(estimator.getFees(providerMock.provider)).to.be.rejected;
      });
    });

    describe("default fallback (1 gwei)", () => {
      it("should use 1 gwei default when network returns 0 priority fee", async () => {
        const estimator = createEip1559Estimator();
        const providerMock = createBasicProviderMock(150, "0x0");

        const fees = await estimator.getFees(providerMock.provider);

        // Should use default 1 gwei (1_000_000_000)
        const DEFAULT_PRIORITY_FEE = 1_000_000_000;
        expect(fees.maxPriorityFeePerGas).to.equal(DEFAULT_PRIORITY_FEE);
        // baseFee = 150 * 2 = 300, maxFeePerGas = 300 + 1_000_000_000
        expect(fees.maxFeePerGas).to.equal(300 + DEFAULT_PRIORITY_FEE);
      });

      it("should keep using 1 gwei default across multiple calls when network returns 0", async () => {
        const estimator = createEip1559Estimator();
        const providerMock = createBasicProviderMock(200, "0x0");

        // First call
        const fees1 = await estimator.getFees(providerMock.provider);
        expect(fees1.maxPriorityFeePerGas).to.equal(1_000_000_000);
        expect(fees1.maxFeePerGas).to.equal(400 + 1_000_000_000);

        // Second call - should still use default
        const fees2 = await estimator.getFees(providerMock.provider);
        expect(fees2.maxPriorityFeePerGas).to.equal(1_000_000_000);
        expect(fees2.maxFeePerGas).to.equal(400 + 1_000_000_000);
      });
    });

    describe("fallbackToEthMaxPriorityFeePerGas", () => {
      it("should handle eth_maxPriorityFeePerGas fallback correctly", async () => {
        const scenarios = [
          {
            name: "fallback activated",
            threshold: 100,
            reward: 5,
            baseFee: 80,
            fallback: 200_000_000,
            fallbackHex: "0xBEBC200",
            fallbackEnabled: true,
            shouldFallback: true,
            expectedPriority: 200_000_000,
            expectedMax: 200_000_160, // 80*2 + 200_000_000
            checkLogs: true,
          },
          {
            name: "fallback not needed - above threshold",
            threshold: 50,
            reward: 100,
            baseFee: 100,
            fallback: null,
            fallbackHex: null,
            fallbackEnabled: true,
            shouldFallback: false,
            expectedPriority: 100,
            expectedMax: 300, // 100*2 + 100
            checkLogs: false,
          },
          {
            name: "fallback disabled - use aggregated",
            threshold: 100,
            reward: 10,
            baseFee: 100,
            fallback: null,
            fallbackHex: null,
            fallbackEnabled: false,
            shouldFallback: false,
            expectedPriority: 10,
            expectedMax: 210, // 100*2 + 10
            checkLogs: false,
          },
          {
            name: "high fallback value",
            threshold: 500,
            reward: 2,
            baseFee: 150,
            fallback: 350_000_000,
            fallbackHex: "0x14DC9380",
            fallbackEnabled: true,
            shouldFallback: true,
            expectedPriority: 350_000_000,
            expectedMax: 350_000_300, // 150*2 + 350_000_000
            checkLogs: true,
          },
          {
            name: "different fallback scenario",
            threshold: 250,
            reward: 8,
            baseFee: 90,
            fallback: 120_000_000,
            fallbackHex: "0x7270E00",
            fallbackEnabled: true,
            shouldFallback: true,
            expectedPriority: 120_000_000,
            expectedMax: 120_000_180, // 90*2 + 120_000_000
            checkLogs: true,
          },
        ];

        for (const scenario of scenarios) {
          const logs: string[] = [];
          const opts = {
            ...DEFAULT_TX_DELIVERY_OPTS,
            minAggregatedRewardsPerBlockForPercentile: scenario.threshold,
            chainConfigs: [
              {
                networkId: 31337,
                fallbackToEthMaxPriorityFeePerGas: scenario.fallbackEnabled,
              },
            ],
            logger: (msg: string) => logs.push(msg),
          } as unknown as Required<TxDeliveryOpts>;
          const estimator = new Eip1559GasEstimatorV2(opts);

          const providerMock = createFallbackProviderMock(
            scenario.baseFee,
            `0x${scenario.reward.toString(16)}`,
            scenario.fallbackHex
          );

          const fees = await estimator.getFees(providerMock.provider);

          expect(fees.maxPriorityFeePerGas).to.equal(
            scenario.expectedPriority,
            `${scenario.name}: priority fee mismatch`
          );
          expect(fees.maxFeePerGas).to.equal(
            scenario.expectedMax,
            `${scenario.name}: max fee mismatch`
          );

          if (scenario.checkLogs) {
            expect(logs.some((log) => log.includes(`below threshold=${scenario.threshold}`))).to.be
              .true;
            if (scenario.shouldFallback) {
              expect(logs.some((log) => log.includes("Fallback to eth_maxPriorityFeePerGas"))).to.be
                .true;
            }
          }
        }
      });
    });

    describe("fee history formatting", () => {
      it("should use decimal format when decimalNumberOfBlocksForFeeHistory is true", async () => {
        const opts = {
          ...DEFAULT_TX_DELIVERY_OPTS,
          numberOfBlocksForFeeHistory: 5,
          chainConfigs: [
            {
              chainId: 31337,
              networkId: 31337,
              decimalNumberOfBlocksForFeeHistory: true,
            },
          ],
          logger: () => undefined,
        } as unknown as Required<TxDeliveryOpts>;
        const estimator = new Eip1559GasEstimatorV2(opts);

        const sendStub = Sinon.stub().callsFake((method: string, params: unknown[]) => {
          if (method === "eth_feeHistory") {
            // Verify decimal format is used (not hex)
            expect(params[0]).to.equal(5);
            expect(params[0]).to.not.equal("0x5");
            return { reward: [["0x5"]] };
          }
          throw new Error(`Unexpected method: ${method}`);
        });

        const providerMock = new HardhatProviderMocker(hardhat.ethers.provider, {
          getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(100) }),
          send: sendStub,
        });

        await estimator.getFees(providerMock.provider);
        expect(sendStub.calledOnce).to.be.true;
      });

      it("should use hex format when decimalNumberOfBlocksForFeeHistory is false", async () => {
        const opts = {
          ...DEFAULT_TX_DELIVERY_OPTS,
          numberOfBlocksForFeeHistory: 10,
          chainConfigs: [
            {
              chainId: 31337,
              networkId: 31337,
              decimalNumberOfBlocksForFeeHistory: false,
            },
          ],
          logger: () => undefined,
        } as unknown as Required<TxDeliveryOpts>;
        const estimator = new Eip1559GasEstimatorV2(opts);

        const sendStub = Sinon.stub().callsFake((method: string, params: unknown[]) => {
          if (method === "eth_feeHistory") {
            // Verify hex format is used (10 = 0xa)
            expect(params[0]).to.equal("0xa");
            return { reward: [["0x5"]] };
          }
          throw new Error(`Unexpected method: ${method}`);
        });

        const providerMock = new HardhatProviderMocker(hardhat.ethers.provider, {
          getBlock: Sinon.stub().resolves({ baseFeePerGas: BigNumber.from(100) }),
          send: sendStub,
        });

        await estimator.getFees(providerMock.provider);
        expect(sendStub.calledOnce).to.be.true;
      });
    });
  });

  describe("percentile progression", () => {
    it("should progress through percentiles correctly", async () => {
      const configs = [
        {
          name: "default percentiles",
          percentiles: [25, 50, 75, 95, 99],
          attempts: 8,
          expected: [25, 50, 75, 95, 99, 99, 99, 99],
        },
        {
          name: "two percentiles",
          percentiles: [40, 80],
          attempts: 5,
          expected: [40, 80, 80, 80, 80],
        },
        {
          name: "single percentile",
          percentiles: 65,
          attempts: 4,
          expected: [65, 65, 65, 65],
        },
        {
          name: "three percentiles",
          percentiles: [30, 70, 90],
          attempts: 6,
          expected: [30, 70, 90, 90, 90, 90],
        },
      ];

      for (const config of configs) {
        const capturedPercentiles: number[] = [];
        const providerMock = createPercentileCaptureProviderMock(100, "0x5", capturedPercentiles);
        const estimator = createEip1559Estimator({
          percentileOfPriorityFee: config.percentiles,
        });

        for (let i = 0; i < config.attempts; i++) {
          await estimator.getFees(providerMock.provider, i);
        }

        expect(capturedPercentiles).to.deep.equal(
          config.expected,
          `${config.name}: percentile progression mismatch`
        );
      }
    });
  });

  describe("integration scenarios", () => {
    it("should maintain fee consistency across multiple getFees calls", async () => {
      const estimator = createEip1559Estimator();
      const providerMock = createBasicProviderMock(100, "0x14");

      // First call
      const fees1 = await estimator.getFees(providerMock.provider);
      expect(fees1.maxPriorityFeePerGas).to.equal(20);
      expect(fees1.maxFeePerGas).to.equal(220); // 100*2 + 20

      // Second call - should maintain the same priority fee
      const fees2 = await estimator.getFees(providerMock.provider);
      expect(fees2.maxPriorityFeePerGas).to.equal(20);
      expect(fees2.maxFeePerGas).to.equal(220);
    });

    it("should handle complete retry flow with scaling", async () => {
      const estimator = createEip1559Estimator({
        percentileOfPriorityFee: 50,
        multiplier: 1.25,
      });

      const providerMock = createBasicProviderMock(100, "0x64");

      // Get initial fees
      const baseFees = await estimator.getFees(providerMock.provider);
      expect(baseFees.maxPriorityFeePerGas).to.equal(100);
      expect(baseFees.maxFeePerGas).to.equal(300); // 200 + 100

      // Scale for attempt 1: 100 * 1.25 = 125
      const scaled1 = estimator.scaleFees(baseFees, 1);
      expect(scaled1.maxPriorityFeePerGas).to.equal(125);
      expect(scaled1.maxFeePerGas).to.equal(325); // 300 + (125 - 100)

      // Scale for attempt 2: 100 * 1.25^2 = 156.25 -> 156
      const scaled2 = estimator.scaleFees(baseFees, 2);
      expect(scaled2.maxPriorityFeePerGas).to.equal(156);
      expect(scaled2.maxFeePerGas).to.equal(356); // 300 + (156 - 100)

      // Scale for attempt 3: 100 * 1.25^3 = 195.3125 -> 195
      const scaled3 = estimator.scaleFees(baseFees, 3);
      expect(scaled3.maxPriorityFeePerGas).to.equal(195);
      expect(scaled3.maxFeePerGas).to.equal(395); // 300 + (195 - 100)
    });

    it("should combine percentile progression, scaling, and anti-underprice protection", async () => {
      const logs: string[] = [];
      const estimator = createEip1559Estimator({
        multiplier: 1.2,
        percentileOfPriorityFee: [50, 75, 95, 99],
        logger: (msg: string) => logs.push(msg),
      });

      let callCount = 0;
      const networkFees = [
        { baseFee: 100, priorityFee: "0x64" }, // 100
        { baseFee: 80, priorityFee: "0x50" }, // 80 (drops)
        { baseFee: 150, priorityFee: "0xC8" }, // 200
        { baseFee: 60, priorityFee: "0x3C" }, // 60 (drops)
        { baseFee: 100, priorityFee: "0x64" }, // 100
        { baseFee: 100, priorityFee: "0x64" }, // 100
      ];

      const capturedPercentiles: number[] = [];
      const providerMock = new HardhatProviderMocker(hardhat.ethers.provider, {
        getBlock: Sinon.stub().callsFake(() => {
          const fee = networkFees[Math.min(callCount, networkFees.length - 1)];
          return Promise.resolve({ baseFeePerGas: BigNumber.from(fee.baseFee) });
        }),
        send: Sinon.stub().callsFake((method: string, params: unknown[]) => {
          if (method === "eth_feeHistory") {
            capturedPercentiles.push((params[2] as number[])[0]);
            const fee = networkFees[Math.min(callCount, networkFees.length - 1)];
            return { reward: [[fee.priorityFee]] };
          }
          throw new Error(`Unexpected method: ${method}`);
        }),
      });

      const allFees: Eip1559Fee[] = [];

      for (let attempt = 0; attempt < 6; attempt++) {
        callCount = attempt;
        const baseFees = await estimator.getFees(providerMock.provider, attempt);
        const scaledFees = estimator.scaleFees(baseFees, attempt);
        allFees.push(scaledFees);
      }

      // Verify percentile progression
      expect(capturedPercentiles).to.deep.equal([50, 75, 95, 99, 99, 99]);

      // Verify anti-underprice protection: each attempt must be at least 1% higher
      for (let i = 1; i < allFees.length; i++) {
        const minRequired = Math.ceil(allFees[i - 1].maxPriorityFeePerGas * 1.01);
        expect(allFees[i].maxPriorityFeePerGas).to.be.at.least(
          minRequired,
          `Attempt ${i}: priority fee must increase by at least 1%`
        );
        const minRequiredMax = Math.ceil(allFees[i - 1].maxFeePerGas * 1.01);
        expect(allFees[i].maxFeePerGas).to.be.at.least(
          minRequiredMax,
          `Attempt ${i}: max fee must increase by at least 1%`
        );
      }

      // Verify bump message was logged when anti-underprice protection kicked in
      expect(logs.some((log) => log.includes("smaller than previous fee bumped by 1%"))).to.be.true;
    });

    it("should use 1 gwei fallback and scale it on retry", async () => {
      const estimator = createEip1559Estimator({
        percentileOfPriorityFee: 50,
        multiplier: 1.5,
      });

      const providerMock = createBasicProviderMock(0, "0x0");

      // Get base fees (should use 1 gwei default)
      const baseFees = await estimator.getFees(providerMock.provider, 0);
      expect(baseFees.maxPriorityFeePerGas).to.equal(1_000_000_000);

      // Scale for attempt 1: 1_000_000_000 * 1.5^1 = 1_500_000_000
      const scaledFees = estimator.scaleFees(baseFees, 1);
      expect(scaledFees.maxPriorityFeePerGas).to.equal(1_500_000_000);
    });
  });
});

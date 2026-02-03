/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { ErrorCode } from "@ethersproject/logger";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumber, BytesLike, Transaction, ethers } from "ethers";
import hardhat from "hardhat";
import _ from "lodash";
import Sinon from "sinon";
import {
  RewardsPerBlockAggregationAlgorithm,
  TxDelivery,
  TxDeliveryOpts,
  convertToTxDeliveryCall,
} from "../../src";
import { CHAIN_ID_TO_GAS_ORACLE } from "../../src/tx-delivery-man/CustomGasOracles";
import { TxNonceCoordinator } from "../../src/tx-delivery-man/TxNonceCoordinator";
import { Counter } from "../../typechain-types";
import { HardhatProviderMocker, deployCounter } from "../helpers";

chai.use(chaiAsPromised);

const underpricedError = {
  code: ErrorCode.INSUFFICIENT_FUNDS,
  message: "maxFeePerGas",
};
const parseTransaction = (transaction: BytesLike) => {
  const parsedTx = ethers.utils.parseTransaction(transaction);

  for (const [key, value] of Object.entries(parsedTx)) {
    if (BigNumber.isBigNumber(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any -- add reason here, please
      (parsedTx as any)[key] = value.toString();
    }
  }

  return parsedTx;
};

const pickGasAndNonceFieldsOfTx = (transaction: Transaction) =>
  _.pick(transaction, ["nonce", "maxFeePerGas", "maxPriorityFeePerGas", "gasLimit"]);

const parseTxForComparison = (transaction: BytesLike) =>
  pickGasAndNonceFieldsOfTx(parseTransaction(transaction));

describe("TxDelivery", () => {
  describe("with single provider", () => {
    let counter!: Counter;
    const providerMocker = new HardhatProviderMocker(hardhat.ethers.provider);

    beforeEach(async () => {
      await hardhat.ethers.provider.send("hardhat_reset", []);
      counter = await deployCounter(providerMocker.provider);
    });

    afterEach(() => {
      providerMocker.reset();
    });

    const createTxDelivery = (opts: Partial<TxDeliveryOpts> = {}) => {
      const provider = counter.provider as ethers.providers.JsonRpcProvider;
      const txNonceCoordinator = new TxNonceCoordinator([provider], counter.signer, {});

      return new TxDelivery(
        {
          expectedDeliveryTimeMs: 20,
          gasLimit: 210000,
          maxAttempts: 10,
          multiplier: 1.125,
          gasLimitMultiplier: 1.1,
          percentileOfPriorityFee: 50, // Use single percentile so multiplier is applied from attempt 1
          rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm.Max,
          ...opts,
        },
        counter.signer,
        provider,
        txNonceCoordinator
      );
    };

    it("should deliver transaction", async () => {
      const delivery = createTxDelivery();

      await assertTxWillBeDelivered(delivery, counter);
    });

    it("should deliver transaction with deferred callData", async () => {
      let count = 1;

      const provider = counter.provider as ethers.providers.JsonRpcProvider;
      const txNonceCoordinator = new TxNonceCoordinator([provider], counter.signer, {});

      const delivery = new TxDelivery(
        {
          maxAttempts: 10,
          multiplier: 1.125,
          gasLimitMultiplier: 1.1,
          expectedDeliveryTimeMs: 20,
          gasLimit: 210000,
          percentileOfPriorityFee: 50, // Use single percentile so multiplier is applied from attempt 1
          rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm.Max,
        },
        counter.signer,
        provider,
        txNonceCoordinator,
        () => counter.populateTransaction["incBy"](count++).then((call) => call.data as string)
      );

      const call = convertToTxDeliveryCall(await counter.populateTransaction["incBy"](count));
      await delivery.deliver(call);

      expect(await counter.getCount()).to.eq(1);
    });

    it("should deliver transaction with deferred callData", async () => {
      const count = 8;

      const provider = counter.provider as ethers.providers.JsonRpcProvider;
      const txNonceCoordinator = new TxNonceCoordinator([provider], counter.signer, {});

      const delivery = new TxDelivery(
        {
          maxAttempts: 10,
          multiplier: 1.125,
          gasLimitMultiplier: 1.1,
          expectedDeliveryTimeMs: 20,
          gasLimit: 210000,
          percentileOfPriorityFee: 50, // Use single percentile so multiplier is applied from attempt 1
          rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm.Max,
        },
        counter.signer,
        provider,
        txNonceCoordinator,
        () => counter.populateTransaction["incBy"](count + 1).then((call) => call.data as string)
      );
      // to enforce sending two transactions
      const getNonceStub = Sinon.stub().onFirstCall().returns(1).onSecondCall().returns(1);

      const sendTransactionStub = Sinon.stub();
      sendTransactionStub.callsFake(hardhat.ethers.provider.sendTransaction);

      providerMocker.set({
        getTransactionCount: getNonceStub,
        sendTransaction: sendTransactionStub,
      });

      const call = convertToTxDeliveryCall(await counter.populateTransaction["incBy"](count));

      await delivery.deliver(call);

      // on position 161 is placed count param in transaction
      expect((sendTransactionStub.getCalls()[0].firstArg as string)[161]).to.eq("8");
      expect((sendTransactionStub.getCalls()[1].firstArg as string)[161]).to.eq("9");
    });

    it("should increase maxGas if transaction failed", async () => {
      const delivery = createTxDelivery();

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().callsFake(hardhat.ethers.provider.sendTransaction);
      providerMocker.set({ sendTransaction: sendStub });

      await assertTxWillBeDelivered(delivery, counter);

      expect(parseTxForComparison(sendStub.firstCall.args[0])).to.deep.equal({
        nonce: 1,
        maxFeePerGas: "3250000000",
        maxPriorityFeePerGas: "1500000000",
        gasLimit: "210000",
      });

      expect(parseTxForComparison(sendStub.secondCall.args[0])).to.deep.equal({
        nonce: 1,
        gasLimit: "210000",
        maxFeePerGas: (3250000000 + (1687500000 - 1500000000)).toString(),
        maxPriorityFeePerGas: "1687500000",
      });
    });

    it("should enforce anti-underprice protection for attempt 0 and 1", async () => {
      const delivery = createTxDelivery({
        multiplier: 1.001,
        percentileOfPriorityFee: 50,
      });

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().callsFake(hardhat.ethers.provider.sendTransaction);
      providerMocker.set({ sendTransaction: sendStub });

      await assertTxWillBeDelivered(delivery, counter);

      const attempt0Tx = parseTxForComparison(sendStub.firstCall.args[0]);
      const attempt0MaxPriorityFee = Number(attempt0Tx.maxPriorityFeePerGas);
      const attempt0MaxFee = Number(attempt0Tx.maxFeePerGas);

      const attempt1Tx = parseTxForComparison(sendStub.secondCall.args[0]);
      const attempt1MaxPriorityFee = Number(attempt1Tx.maxPriorityFeePerGas);
      const attempt1MaxFee = Number(attempt1Tx.maxFeePerGas);

      const minRequiredPriorityFee = Math.ceil(attempt0MaxPriorityFee * 1.01);
      const minRequiredMaxFee = Math.ceil(attempt0MaxFee * 1.01);

      expect(attempt1MaxPriorityFee).to.be.at.least(
        minRequiredPriorityFee,
        `Attempt 1 maxPriorityFeePerGas (${attempt1MaxPriorityFee}) should be at least 1% higher than attempt 0 (${attempt0MaxPriorityFee}, min: ${minRequiredPriorityFee})`
      );
      expect(attempt1MaxFee).to.be.at.least(
        minRequiredMaxFee,
        `Attempt 1 maxFeePerGas (${attempt1MaxFee}) should be at least 1% higher than attempt 0 (${attempt0MaxFee}, min: ${minRequiredMaxFee})`
      );

      expect(attempt0Tx.nonce).to.equal(attempt1Tx.nonce);
      expect(attempt0Tx.nonce).to.equal(1);
      expect(attempt1MaxPriorityFee).to.be.greaterThan(attempt0MaxPriorityFee);
      expect(attempt1MaxFee).to.be.greaterThan(attempt0MaxFee);
    });

    it("should updated gas limit after expectedDeliveryTimePassed", async () => {
      const sendStub = Sinon.stub();
      sendStub.callsFake(hardhat.ethers.provider.sendTransaction);
      const getNonceStub = Sinon.stub();
      getNonceStub
        .onFirstCall()
        .returns(1)
        // simulating passing time by returning stale nonce
        .onSecondCall()
        .returns(1)
        .onThirdCall()
        .returns(2);

      providerMocker.set({
        sendTransaction: sendStub,
        getTransactionCount: getNonceStub,
      });

      const delivery = createTxDelivery();

      await assertTxWillBeDelivered(delivery, counter);

      expect(sendStub.getCalls().length).to.eq(2);
    });

    it("should error after max attempts", async () => {
      const delivery = createTxDelivery({
        maxAttempts: 2,
      });

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().rejects(underpricedError);
      providerMocker.set({ sendTransaction: sendStub });

      const call = convertToTxDeliveryCall(await counter.populateTransaction["inc"]());

      await expect(delivery.deliver(call)).rejectedWith();
    });

    it("should increase gas limit for 2d prices", async () => {
      const delivery = createTxDelivery({
        twoDimensionalFees: true,
        gasLimit: undefined,
      });

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().callsFake(hardhat.ethers.provider.sendTransaction);
      providerMocker.set({ sendTransaction: sendStub });

      await assertTxWillBeDelivered(delivery, counter);

      expect(parseTxForComparison(sendStub.firstCall.args[0])).to.deep.equal({
        nonce: 1,
        maxFeePerGas: "3250000000",
        maxPriorityFeePerGas: "1500000000",
        gasLimit: "49321",
      });

      expect(parseTxForComparison(sendStub.secondCall.args[0])).to.deep.equal({
        nonce: 1,
        maxFeePerGas: (3250000000 + (1687500000 - 1500000000)).toString(),
        maxPriorityFeePerGas: "1687500000",
        gasLimit: "54253",
      });
    });

    it("should work with auction model", async () => {
      const delivery = createTxDelivery({
        isAuctionModel: true,
      });

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().callsFake(hardhat.ethers.provider.sendTransaction);
      providerMocker.set({ sendTransaction: sendStub });

      await assertTxWillBeDelivered(delivery, counter);
      expect(
        _.pick(parseTransaction(sendStub.firstCall.args[0]), ["nonce", "gasLimit"])
      ).to.deep.equal({
        nonce: 1,
        gasLimit: "210000",
      });
      //
      expect(Number(parseTransaction(sendStub.firstCall.args[0]).gasPrice)).to.be.closeTo(
        1768378450,
        1_000_000
      );

      expect(
        _.pick(parseTransaction(sendStub.secondCall.args[0]), ["nonce", "gasLimit"])
      ).to.deep.equal({
        nonce: 1,
        gasLimit: "210000",
      });

      expect(Number(parseTransaction(sendStub.secondCall.args[0]).gasPrice)).to.be.closeTo(
        1989425756,
        1_000_000
      );
    });

    it("should use multiple percentiles [p50, p99] and apply multiplier only after exhausting percentiles", async () => {
      const delivery = createTxDelivery({
        percentileOfPriorityFee: [50, 99],
        multiplier: 1.125,
      });

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError); // Attempt 0 fails
      sendStub.onSecondCall().rejects(underpricedError); // Attempt 1 fails
      sendStub.onThirdCall().rejects(underpricedError); // Attempt 2 fails
      sendStub.onCall(3).callsFake(hardhat.ethers.provider.sendTransaction); // Attempt 3 succeeds

      // Mock eth_feeHistory to return different values for different percentiles
      const sendMethodStub = Sinon.stub();
      sendMethodStub.callsFake((method: string, params: unknown[]) => {
        if (method === "eth_feeHistory") {
          const percentile = (params[2] as number[])[0];
          if (percentile === 50) {
            return Promise.resolve({ reward: [["0x59682f00"]] }); // 1500000000 in hex (p50)
          } else if (percentile === 99) {
            return Promise.resolve({ reward: [["0x77359400"]] }); // 2000000000 in hex (p99)
          }
        }
        return hardhat.ethers.provider.send(method, params);
      });

      providerMocker.set({
        sendTransaction: sendStub,
        send: sendMethodStub,
      });

      await assertTxWillBeDelivered(delivery, counter);

      // Attempt 0: Uses p50 percentile, no multiplier (multiplierExponent = 0)
      const attempt0Tx = parseTxForComparison(sendStub.getCall(0).args[0]);
      expect(attempt0Tx.nonce).to.equal(1);
      expect(attempt0Tx.gasLimit).to.equal("210000");
      // Base priority fee from p50 percentile: 1500000000
      expect(attempt0Tx.maxPriorityFeePerGas).to.equal("1500000000");

      // Attempt 1: Uses p99 percentile, no multiplier (multiplierExponent = 0)
      const attempt1Tx = parseTxForComparison(sendStub.getCall(1).args[0]);
      expect(attempt1Tx.nonce).to.equal(1);
      expect(attempt1Tx.gasLimit).to.equal("210000");
      // p99 returns 2000000000, which is higher than 1% bump of previous (1515000000)
      expect(attempt1Tx.maxPriorityFeePerGas).to.equal("2000000000");

      // Attempt 2: Still uses p99 percentile (last in array), multiplier applied once (multiplierExponent = 1)
      // multiplier^1 = 1.125, so 2000000000 * 1.125 = 2250000000
      const attempt2Tx = parseTxForComparison(sendStub.getCall(2).args[0]);
      expect(attempt2Tx.nonce).to.equal(1);
      expect(attempt2Tx.gasLimit).to.equal("210000");
      expect(attempt2Tx.maxPriorityFeePerGas).to.equal("2250000000");

      // Attempt 3: Still uses p99 percentile, multiplier applied twice (multiplierExponent = 2)
      // multiplier^2 = 1.265625, so 2000000000 * 1.265625 = 2531250000
      const attempt3Tx = parseTxForComparison(sendStub.getCall(3).args[0]);
      expect(attempt3Tx.nonce).to.equal(1);
      expect(attempt3Tx.gasLimit).to.equal("210000");
      expect(attempt3Tx.maxPriorityFeePerGas).to.equal("2531250000");

      // Verify that fees are increasing across attempts
      expect(Number(attempt1Tx.maxPriorityFeePerGas)).to.be.greaterThan(
        Number(attempt0Tx.maxPriorityFeePerGas)
      );
      expect(Number(attempt2Tx.maxPriorityFeePerGas)).to.be.greaterThan(
        Number(attempt1Tx.maxPriorityFeePerGas)
      );
      expect(Number(attempt3Tx.maxPriorityFeePerGas)).to.be.greaterThan(
        Number(attempt2Tx.maxPriorityFeePerGas)
      );
    });

    it("should pass attempt parameter to gas oracle", async () => {
      const capturedAttempts: number[] = [];
      const mockGasOracle = Sinon.stub().callsFake((_opts: TxDeliveryOpts, attempt: number) => {
        capturedAttempts.push(attempt);
        return Promise.resolve({
          maxFeePerGas: 2000000000,
          maxPriorityFeePerGas: 1000000000,
        });
      });

      const hardhatChainId = 31337;
      CHAIN_ID_TO_GAS_ORACLE[hardhatChainId] = mockGasOracle;

      const sendStub = Sinon.stub();
      sendStub.onFirstCall().rejects(underpricedError);
      sendStub.onSecondCall().callsFake(hardhat.ethers.provider.sendTransaction);
      providerMocker.set({ sendTransaction: sendStub });

      const delivery = createTxDelivery();
      const call = convertToTxDeliveryCall(await counter.populateTransaction["inc"]());
      await delivery.deliver(call);

      expect(capturedAttempts).to.include(0);
      expect(capturedAttempts).to.include(1);

      delete CHAIN_ID_TO_GAS_ORACLE[hardhatChainId];
    });
  });
});

async function assertTxWillBeDelivered(
  delivery: TxDelivery,
  counter: Counter,
  expectedCounterValue = 1
) {
  const call = convertToTxDeliveryCall(await counter.populateTransaction["inc"]());
  await delivery.deliver(call);
  expect(await counter.getCount()).to.eq(expectedCounterValue);
}

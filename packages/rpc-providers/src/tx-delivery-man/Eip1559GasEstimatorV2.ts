import {
  ChainConfig,
  getChainConfigByNetworkId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { getProviderNetworkId } from "../common";
import { GasEstimator } from "./GasEstimator";
import {
  RewardsPerBlockAggregationAlgorithm,
  unsafeBnToNumber,
  type Eip1559Fee,
  type TxDeliveryOptsValidated,
} from "./common";

type FeeHistoryResponse = { reward: string[] };

// as stated in eth spec max increase is 12.5% per block
// however this fee is refunded anyway, so we are okey with having bigger margin
const BASE_FEE_SCALER = 2;

// Protection against "replacement transaction underpriced" errors
const ANTI_UNDERPRICE_BUMP = 1.01;

/**
 * Gas estimator for EIP-1559 compatible chains.
 *
 * Features:
 * - Percentile progression: Uses progressively higher percentiles (25 → 50 → 75 → 95 → 99)
 *   for fee estimation across retry attempts. This helps transactions get included faster
 *   on subsequent attempts without immediately jumping to very high fees.
 * - Anti-underprice protection: Tracks previously used fees and ensures each retry is at least
 *   1% higher to prevent "replacement transaction underpriced" errors.
 */
export class Eip1559GasEstimatorV2 implements GasEstimator<Eip1559Fee> {
  private previousFee: Eip1559Fee = {
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 0,
  };
  private readonly percentiles: number[];
  private maxPriorityFeePerGas = 1_000_000_000;

  constructor(readonly opts: TxDeliveryOptsValidated) {
    this.percentiles = Array.isArray(opts.percentileOfPriorityFee)
      ? opts.percentileOfPriorityFee
      : [opts.percentileOfPriorityFee];
  }

  async getFees(provider: providers.JsonRpcProvider, attempt: number = 0): Promise<Eip1559Fee> {
    const [lastBlock, _] = await Promise.all([
      provider.getBlock("latest"),
      this.refreshLastUsedPriorityFee(provider, attempt),
    ]);

    const baseFee = Math.round(unsafeBnToNumber(lastBlock.baseFeePerGas!) * BASE_FEE_SCALER);
    const maxFeePerGas = baseFee + this.maxPriorityFeePerGas;

    const fee: Eip1559Fee = {
      maxFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
    };

    return fee;
  }

  private async refreshLastUsedPriorityFee(provider: providers.JsonRpcProvider, attempt: number) {
    const newPriorityFee = await this.estimatePriorityFee(provider, attempt);

    if (newPriorityFee !== 0) {
      this.maxPriorityFeePerGas = newPriorityFee;
    }
  }

  private async estimatePriorityFee(
    provider: providers.JsonRpcProvider,
    attempt: number
  ): Promise<number> {
    const networkId = await getProviderNetworkId(provider);

    const chainConfig = getChainConfigByNetworkId(
      this.opts.chainConfigs ?? getLocalChainConfigs(),
      networkId
    );

    const percentile = this.getPercentileForAttempt(attempt);
    const rewardsPerBlockForPercentile = await this.getRewardsPerBlock(
      provider,
      chainConfig,
      percentile
    );
    const aggregatedRewardsPerBlock = this.aggregateRewards(rewardsPerBlockForPercentile);

    this.opts.logger(
      `Fetched rewardsPerBlockForPercentile (percentile=${percentile}, attempt=${attempt}): ${rewardsPerBlockForPercentile.toString()}, having ${this.opts.rewardsPerBlockAggregationAlgorithm}=${aggregatedRewardsPerBlock}`
    );

    if (aggregatedRewardsPerBlock > (this.opts.minAggregatedRewardsPerBlockForPercentile ?? 0)) {
      return aggregatedRewardsPerBlock;
    } else {
      this.opts.logger(
        `aggregatedRewardsPerBlock=${aggregatedRewardsPerBlock} is below threshold=${this.opts.minAggregatedRewardsPerBlockForPercentile ?? 0}`
      );
    }

    if (chainConfig.fallbackToEthMaxPriorityFeePerGas) {
      return await this.fallbackToEthMaxPriorityFeePerGas(provider);
    }

    return aggregatedRewardsPerBlock;
  }

  private async getRewardsPerBlock(
    provider: providers.JsonRpcProvider,
    chainConfig: ChainConfig,
    percentile: number
  ): Promise<number[]> {
    const feeHistory = (await provider.send("eth_feeHistory", [
      chainConfig.decimalNumberOfBlocksForFeeHistory
        ? this.opts.numberOfBlocksForFeeHistory
        : "0x" + this.opts.numberOfBlocksForFeeHistory.toString(16),
      this.opts.newestBlockForFeeHistory,
      [percentile],
    ])) as FeeHistoryResponse;

    return feeHistory.reward.flat().map((hex: string) => parseInt(hex, 16));
  }

  private async fallbackToEthMaxPriorityFeePerGas(
    provider: providers.JsonRpcProvider
  ): Promise<number> {
    const ethMaxPriorityFeePerGasResult = Number(
      await provider.send("eth_maxPriorityFeePerGas", [])
    );
    this.opts.logger(`Fallback to eth_maxPriorityFeePerGas=${ethMaxPriorityFeePerGasResult}`);
    return ethMaxPriorityFeePerGasResult;
  }

  private aggregateRewards(rewards: number[]): number {
    switch (this.opts.rewardsPerBlockAggregationAlgorithm) {
      case RewardsPerBlockAggregationAlgorithm.Max:
        return Math.max(...rewards);
      case RewardsPerBlockAggregationAlgorithm.Median:
        return Math.ceil(MathUtils.getMedian(rewards));
      default: {
        return RedstoneCommon.throwUnsupportedParamError(
          this.opts.rewardsPerBlockAggregationAlgorithm
        );
      }
    }
  }

  scaleFees(currentFees: Eip1559Fee, attempt: number): Eip1559Fee {
    this.ensureFreshState(attempt);
    const scaledPriorityFee = this.getScaledPriorityFee(currentFees, attempt);
    const minRequiredMaxFee = this.applyAntiUnderprice(this.previousFee.maxFeePerGas);
    const minRequiredPriorityFee = this.applyAntiUnderprice(this.previousFee.maxPriorityFeePerGas);

    const maxPriorityFeePerGas = Math.max(scaledPriorityFee, minRequiredPriorityFee);
    const priorityFeeIncrease = maxPriorityFeePerGas - currentFees.maxPriorityFeePerGas;
    const adjustedMaxFee = currentFees.maxFeePerGas + priorityFeeIncrease;
    const maxFeePerGas = Math.max(adjustedMaxFee, minRequiredMaxFee);

    this.previousFee = {
      maxPriorityFeePerGas: Math.max(this.previousFee.maxPriorityFeePerGas, maxPriorityFeePerGas),
      maxFeePerGas: Math.max(this.previousFee.maxFeePerGas, maxFeePerGas),
    };

    const scaledFees: Eip1559Fee = {
      maxPriorityFeePerGas,
      maxFeePerGas,
    };

    this.logIfBumped(scaledPriorityFee, minRequiredPriorityFee);
    this.logScaling(attempt, maxFeePerGas, maxPriorityFeePerGas);

    return scaledFees;
  }

  private getPercentileForAttempt(attempt: number): number {
    const index = Math.min(attempt, this.percentiles.length - 1);
    return this.percentiles[index];
  }

  private logIfBumped(scaledPriorityFee: number, minRequiredPriorityFee: number) {
    const wasBumped = scaledPriorityFee < minRequiredPriorityFee;
    if (wasBumped) {
      this.opts.logger(
        `New fee ${scaledPriorityFee} is smaller than previous fee bumped by 1% (${minRequiredPriorityFee}), using bumped value to avoid underpriced error`
      );
    }
  }

  private logScaling(attempt: number, maxFeePerGas: number, maxPriorityFeePerGas: number) {
    this.opts.logger(
      `Scaling fees (multiplier=${this.getMultiplier(attempt)}) to maxFeePerGas=${maxFeePerGas} maxPriorityFeePerGas=${maxPriorityFeePerGas}`
    );
  }

  private getScaledPriorityFee(currentFees: Eip1559Fee, attempt: number): number {
    const multiplier = this.getMultiplier(attempt);
    return Math.round(currentFees.maxPriorityFeePerGas * multiplier);
  }

  private applyAntiUnderprice(previousValue: number): number {
    return Math.ceil(previousValue * ANTI_UNDERPRICE_BUMP);
  }

  /**
   * Determine multiplier exponent based on percentile configuration.
   * Only apply multiplier after exhausting all percentiles from array
   */
  private getMultiplierExponent(attempt: number): number {
    if (this.percentiles.length > 1) {
      return Math.max(0, attempt - (this.percentiles.length - 1));
    } else {
      return attempt;
    }
  }

  /**
   * This method is used as a safety measure to prevent underprice protection between different
   * transactions in case this class instance is wrongly reused
   */
  private ensureFreshState(attempt: number) {
    if (attempt === 0) {
      this.previousFee = {
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
      };
    }
  }

  private getMultiplier(attempt: number): number {
    return this.opts.multiplier ** this.getMultiplierExponent(attempt);
  }
}

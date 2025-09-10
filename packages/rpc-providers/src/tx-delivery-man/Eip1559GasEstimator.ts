import {
  ChainConfig,
  getChainConfigByNetworkId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { providers } from "ethers";
import { getProviderNetworkId } from "../common";
import { GasEstimator } from "./GasEstimator";
import { unsafeBnToNumber, type Eip1559Fee, type TxDeliveryOptsValidated } from "./common";

type FeeHistoryResponse = { reward: string[] };

// as stated in eth spec max increase is 12.5% per block
// however this fee is refunded anyway, so we are okey with having bigger margin
const BASE_FEE_SCALER = 2;

export class Eip1559GasEstimator implements GasEstimator<Eip1559Fee> {
  constructor(readonly opts: TxDeliveryOptsValidated) {}

  private maxPriorityFeePerGas = 1_000_000_000;

  /** this is reasonable (ether.js is not reasonable) fallback if gasOracle is not set */
  async getFees(provider: providers.JsonRpcProvider): Promise<Eip1559Fee> {
    const lastBlock = await provider.getBlock("latest");
    await this.refreshLastUsedPriorityFee(provider);

    const baseFee = Math.round(unsafeBnToNumber(lastBlock.baseFeePerGas!) * BASE_FEE_SCALER);
    const maxFeePerGas = baseFee + this.maxPriorityFeePerGas;

    const fee: Eip1559Fee = {
      maxFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
    };

    return fee;
  }

  private async refreshLastUsedPriorityFee(provider: providers.JsonRpcProvider) {
    const newPriorityFee = await this.estimatePriorityFee(provider);

    if (newPriorityFee !== 0) {
      this.maxPriorityFeePerGas = newPriorityFee;
    }
  }

  /**
   * Take value of percentileOfPriorityFee from last N blocks
   * And return maximal value from it
   * If returns 0 fallbacks to default, which is described per chain in chain-configs.json
   * if it is not defined for current chain, returns 0
   */
  private async estimatePriorityFee(provider: providers.JsonRpcProvider): Promise<number> {
    const networkId = await getProviderNetworkId(provider);

    const chainConfig = getChainConfigByNetworkId(getLocalChainConfigs(), networkId);

    const feeHistory = await this.getFeeHistory(provider, chainConfig);

    const rewardsPerBlockForPercentile = feeHistory.reward
      .flat()
      .map((hex: string) => parseInt(hex, 16));

    const maxRewardsPerBlockForPercentile = Math.max(...rewardsPerBlockForPercentile);

    this.opts.logger(
      `Fetched rewardsPerBlockForPercentile: ${rewardsPerBlockForPercentile.toString()}, having max=${maxRewardsPerBlockForPercentile}`
    );

    if (maxRewardsPerBlockForPercentile !== 0) {
      return maxRewardsPerBlockForPercentile;
    }

    if (chainConfig.fallbackToEthMaxPriorityFeePerGas) {
      const ethMaxPriorityFeePerGasResult = Number(
        await provider.send("eth_maxPriorityFeePerGas", [])
      );
      this.opts.logger(
        `Fallback to eth_maxPriorityFeePerGas=${ethMaxPriorityFeePerGasResult}  because maxRewardsPerBlockForPercentile=0`
      );
      return ethMaxPriorityFeePerGasResult;
    }

    return maxRewardsPerBlockForPercentile;
  }

  private async getFeeHistory(
    provider: providers.JsonRpcProvider,
    chainConfig: ChainConfig
  ): Promise<FeeHistoryResponse> {
    return (await provider.send("eth_feeHistory", [
      chainConfig.decimalNumberOfBlocksForFeeHistory
        ? this.opts.numberOfBlocksForFeeHistory
        : "0x" + this.opts.numberOfBlocksForFeeHistory.toString(16),
      this.opts.newestBlockForFeeHistory,
      [this.opts.percentileOfPriorityFee],
    ])) as FeeHistoryResponse;
  }

  scaleFees(currentFees: Eip1559Fee, attempt: number): Eip1559Fee {
    const multipleBy = this.opts.multiplier ** attempt;
    const maxPriorityFeePerGas = Math.round(currentFees.maxPriorityFeePerGas * multipleBy);
    const maxPriorityFeePerGasDiff = maxPriorityFeePerGas - currentFees.maxPriorityFeePerGas;
    const maxFeePerGas = currentFees.maxFeePerGas + maxPriorityFeePerGasDiff;

    const scaledFees: Eip1559Fee = {
      maxPriorityFeePerGas,
      maxFeePerGas,
    };

    this.opts.logger(
      `Scaling fees (multiplier=${multipleBy}) to maxFeePerGas=${maxFeePerGas} maxPriorityFeePerGas=${maxPriorityFeePerGas}`
    );

    return scaledFees;
  }
}

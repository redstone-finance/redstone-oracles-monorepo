import { ethers } from "ethers";
import { GasEstimator } from "./GasEstimator";
import { unsafeBnToNumber, type AuctionModelFee, type TxDeliveryOptsValidated } from "./common";

/**
 * Gas estimator for the auction model that uses explicit, per-attempt gas price
 * multipliers from configuration instead of exponential backoff/scaling.
 *
 * When {@link TxDeliveryOptsValidated} is configured with `auctionModelGasMultipliers`,
 * this estimator applies the configured multiplier for each resend attempt,
 * clamping to the last multiplier for higher attempts.
 */
export class AuctionModelGasEstimatorV2 implements GasEstimator<AuctionModelFee> {
  constructor(readonly opts: TxDeliveryOptsValidated) {}

  async getFees(provider: ethers.providers.JsonRpcProvider): Promise<AuctionModelFee> {
    return {
      gasPrice: unsafeBnToNumber(await provider.getGasPrice()),
    };
  }

  scaleFees(currentFees: AuctionModelFee, attempt: number): AuctionModelFee {
    const multipliers = this.opts.auctionModelGasMultipliers;
    if (!multipliers || multipliers.length === 0) {
      return { gasPrice: currentFees.gasPrice };
    }

    const index = Math.min(attempt, multipliers.length - 1);
    return { gasPrice: Math.round(currentFees.gasPrice * multipliers[index]) };
  }
}

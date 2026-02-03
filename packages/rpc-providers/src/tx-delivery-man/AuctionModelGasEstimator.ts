import { ethers } from "ethers";
import { GasEstimator } from "./GasEstimator";
import { unsafeBnToNumber, type AuctionModelFee, type TxDeliveryOptsValidated } from "./common";

/**
 * Gas estimator for legacy (auction model) chains that don't support EIP-1559.
 *
 * Fee increases are handled solely through multiplier-based scaling
 * in the scaleFees() method.
 */
export class AuctionModelGasEstimator implements GasEstimator<AuctionModelFee> {
  constructor(readonly opts: TxDeliveryOptsValidated) {}

  async getFees(provider: ethers.providers.JsonRpcProvider): Promise<AuctionModelFee> {
    return {
      gasPrice: unsafeBnToNumber(await provider.getGasPrice()),
    };
  }

  scaleFees(currentFees: AuctionModelFee, attempt: number): AuctionModelFee {
    const multipleBy = this.opts.multiplier ** attempt;
    const gasPrice = Math.round(currentFees.gasPrice * multipleBy);

    const scaledFees: AuctionModelFee = {
      gasPrice,
    };

    return scaledFees;
  }
}

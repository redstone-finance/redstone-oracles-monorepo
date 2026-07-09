import { loggerFactory } from "@redstone-finance/utils";
import { PublicKey } from "@solana/web3.js";
import { maxPricePerComputeUnit, SolanaConfig } from "../config";
import { ISolanaGasOracle } from "./ISolanaGasOracle";

export class RegularSolanaGasOracle implements ISolanaGasOracle {
  private readonly logger = loggerFactory("solana-gas-oracle");

  constructor(private readonly config: SolanaConfig) {}

  getPriorityFeePerUnit(
    iterationIndex: number,
    _lockedWritableAccounts: PublicKey[],
    computeUnits: number
  ) {
    const fee = Math.ceil(
      this.config.basePricePerComputeUnit * this.config.gasMultiplier ** iterationIndex
    );

    const maxPricePerUnit = maxPricePerComputeUnit(this.config, computeUnits);
    const finalFeePerUnit = Math.min(fee, maxPricePerUnit);
    this.logger.info(
      `Setting transaction cost per unit to ${finalFeePerUnit} (max price per compute unit: ${maxPricePerUnit})`
    );

    return Promise.resolve(finalFeePerUnit);
  }
}

import { loggerFactory } from "@redstone-finance/utils";
import { Connection } from "@solana/web3.js";
import { SolanaConfig } from "../config";
import { ISolanaGasOracle } from "./ISolanaGasOracle";

export class AggressiveSolanaGasOracle implements ISolanaGasOracle {
  private readonly logger = loggerFactory("solana-gas-oracle");

  constructor(
    private readonly connection: Connection,
    private readonly config: SolanaConfig
  ) {}

  getPriorityFeePerUnit(iterationIndex: number): Promise<number> {
    const fee = Math.ceil(
      this.config.basePricePerComputeUnit *
        this.config.gasMultiplier ** iterationIndex
    );

    const finalFeePerUnit = Math.min(fee, this.config.maxPricePerComputeUnit);
    this.logger.info(
      `Setting transaction cost per unit to ${finalFeePerUnit} (max price per compute unit: ${this.config.maxPricePerComputeUnit})`
    );

    return Promise.resolve(finalFeePerUnit);
  }
}

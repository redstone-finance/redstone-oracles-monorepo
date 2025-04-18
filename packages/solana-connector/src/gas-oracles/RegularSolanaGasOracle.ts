import { loggerFactory } from "@redstone-finance/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import _ from "lodash";
import { SolanaConfig } from "../config";
import { ISolanaGasOracle } from "./ISolanaGasOracle";

const NUMBER_OF_LAST_SLOTS = 50; // 50 * 400ms = 20 sec

export class RegularSolanaGasOracle implements ISolanaGasOracle {
  private readonly logger = loggerFactory("solana-gas-oracle");

  constructor(
    private readonly connection: Connection,
    private readonly config: SolanaConfig
  ) {}

  async getPriorityFeePerUnit(
    lockedWritableAccounts: PublicKey[],
    iterationIndex = 0
  ) {
    const fees = await this.connection.getRecentPrioritizationFees({
      lockedWritableAccounts,
    });

    let recentFee: number | undefined;
    const maxSlot = _.maxBy(fees, (fee) => fee.slot);
    if (maxSlot) {
      const lastFees = _.filter(
        fees,
        (entry) => entry.slot >= maxSlot.slot - NUMBER_OF_LAST_SLOTS
      );
      const maxFeeSlot = _.maxBy(lastFees, (entry) => entry.prioritizationFee);
      recentFee = maxFeeSlot?.prioritizationFee;
    }
    const priorityFeeUnitPriceCostInMicroLamports = Math.ceil(
      this.config.gasMultiplier ** iterationIndex
    );

    const fee = recentFee
      ? Math.max(recentFee, priorityFeeUnitPriceCostInMicroLamports)
      : priorityFeeUnitPriceCostInMicroLamports;

    const finalFeePerUnit = Math.min(fee, this.config.maxPricePerComputeUnit);

    this.logger.info(
      `RecentFee: ${recentFee}, calculated fee by iteration: ${priorityFeeUnitPriceCostInMicroLamports}`
    );
    this.logger.info(
      `Max price per compute unit: ${this.config.maxPricePerComputeUnit}`
    );
    this.logger.info(`Setting transaction cost per unit to ${finalFeePerUnit}`);

    return finalFeePerUnit;
  }
}

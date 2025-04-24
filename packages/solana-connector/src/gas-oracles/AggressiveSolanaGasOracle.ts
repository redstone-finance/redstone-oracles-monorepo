import { loggerFactory } from "@redstone-finance/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import _ from "lodash";
import { SolanaConfig } from "../config";
import { ISolanaGasOracle } from "./ISolanaGasOracle";

const BASE_PRIORITY_FEE_PERCENTILE = 80;
const PRIORITY_FEE_PERCENTILE_STEP = 5;
const MIN_DEFAULT_PRIORITY_FEE = 1; // microLamport

export class AggressiveSolanaGasOracle implements ISolanaGasOracle {
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
    const prioritizationFees = fees.map((entry) => entry.prioritizationFee);
    const percentileForUse =
      BASE_PRIORITY_FEE_PERCENTILE +
      iterationIndex * PRIORITY_FEE_PERCENTILE_STEP;
    this.logPercentiles(prioritizationFees, percentileForUse);

    const recentPriorityFeePercentile = calculatePercentile(
      prioritizationFees,
      percentileForUse
    );
    const iterationGasMultiplier = this.config.gasMultiplier ** iterationIndex;
    const maxRecentPriorityFee =
      recentPriorityFeePercentile || MIN_DEFAULT_PRIORITY_FEE;

    const priorityFee = Math.min(
      Math.ceil(maxRecentPriorityFee * iterationGasMultiplier),
      this.config.maxPricePerComputeUnit
    );

    this.logger.info(
      [
        `Priority fee per unit: ${priorityFee}`,
        `${percentileForUse}th Priority Fee Percentile: ${recentPriorityFeePercentile}`,
        iterationIndex
          ? `iterationGasMultiplier in iteration #${iterationIndex}: ${iterationGasMultiplier}`
          : "",
      ]
        .filter((s) => s !== "")
        .join("; ")
    );

    return priorityFee;
  }

  private logPercentiles(
    prioritizationFees: number[],
    percentileForUse: number
  ) {
    const step = 1;
    const startPercentile = BASE_PRIORITY_FEE_PERCENTILE;
    const percentiles = Array.from(
      {
        length: 1 + Math.ceil((100 - startPercentile) / step),
      },
      (_, index) => [
        startPercentile + index * step,
        calculatePercentile(prioritizationFees, startPercentile + index * step),
      ]
    );

    this.logger.log(`Current prioritization fee percentiles:`, {
      percentileForUse,
      percentiles: Object.fromEntries(percentiles) as { [p: number]: number },
    });
  }
}

function calculatePercentile(data: number[], percentile: number) {
  if (data.length === 0) {
    return undefined;
  }

  const sortedData = _.sortBy(data);
  const index = Math.ceil((Math.min(percentile, 100) / 100) * data.length) - 1;

  return sortedData[index];
}

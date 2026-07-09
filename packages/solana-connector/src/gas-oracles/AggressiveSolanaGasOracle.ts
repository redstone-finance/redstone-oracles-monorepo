import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { PublicKey } from "@solana/web3.js";
import _ from "lodash";
import { SolanaClient } from "../client/SolanaClient";
import { maxPricePerComputeUnit, SolanaConfig } from "../config";
import { ISolanaGasOracle } from "./ISolanaGasOracle";

const MARKET_FEE_TIMEOUT_MS = 1_000;
const MARKET_ATTEMPTS_FROM = 2;
const CAP_ATTEMPTS_FROM = 4;

export class AggressiveSolanaGasOracle implements ISolanaGasOracle {
  private readonly logger = loggerFactory("solana-gas-oracle");

  constructor(
    private readonly client: SolanaClient,
    private readonly config: SolanaConfig
  ) {}

  async getPriorityFeePerUnit(
    iterationIndex: number,
    lockedWritableAccounts: PublicKey[],
    computeUnits: number
  ) {
    const maxPricePerUnit = maxPricePerComputeUnit(this.config, computeUnits);
    const rawFee = await this.getRawPriorityFeePerUnit(
      iterationIndex,
      lockedWritableAccounts,
      maxPricePerUnit
    );
    const priorityFee = Math.min(rawFee, maxPricePerUnit);

    this.logger.debug(
      `Priority fee per unit: ${priorityFee} (max price per unit: ${maxPricePerUnit}); iterationIndex #${iterationIndex}`
    );

    return priorityFee;
  }

  private async getRawPriorityFeePerUnit(
    iterationIndex: number,
    lockedWritableAccounts: PublicKey[],
    maxPricePerUnit: number
  ) {
    if (iterationIndex >= CAP_ATTEMPTS_FROM) {
      return this.getCapFee(iterationIndex, maxPricePerUnit);
    }

    if (iterationIndex < MARKET_ATTEMPTS_FROM) {
      return this.getBaseFee(iterationIndex);
    }

    return await this.getMarketAwareFee(iterationIndex, lockedWritableAccounts);
  }

  private getCapFee(iterationIndex: number, maxPricePerUnit: number) {
    const capDivisor =
      this.config.gasMultiplier ** (this.config.maxTxAttempts - 1 - iterationIndex);

    return Math.max(
      Math.ceil(maxPricePerUnit / capDivisor),
      this.escalateFee(this.config.basePricePerComputeUnit, iterationIndex)
    );
  }

  private getBaseFee(iterationIndex: number) {
    return this.escalateFee(this.config.basePricePerComputeUnit, iterationIndex);
  }

  private async getMarketAwareFee(iterationIndex: number, lockedWritableAccounts: PublicKey[]) {
    const marketFee = await this.fetchMarketFee(lockedWritableAccounts);

    this.logger.info(
      `${this.config.percentileOfPriorityFee}th percentile of recent fees: ${marketFee}`
    );

    return Math.max(
      this.escalateFee(marketFee, iterationIndex - MARKET_ATTEMPTS_FROM),
      this.escalateFee(this.config.basePricePerComputeUnit, iterationIndex)
    );
  }

  private escalateFee(fee: number, steps: number) {
    return Math.ceil(fee * this.config.gasMultiplier ** steps);
  }

  private async fetchMarketFee(lockedWritableAccounts: PublicKey[]) {
    try {
      const fees = await RedstoneCommon.timeout(
        this.client.getRecentPrioritizationFees({ lockedWritableAccounts }),
        MARKET_FEE_TIMEOUT_MS
      );
      const nonZeroFees = fees
        .map(({ prioritizationFee }) => prioritizationFee)
        .filter((fee) => fee > 0);

      return calculatePercentile(nonZeroFees, this.config.percentileOfPriorityFee) ?? 0;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch recent prioritization fees: ${RedstoneCommon.stringifyError(error)}`
      );

      return 0;
    }
  }
}

function calculatePercentile(data: number[], percentile: number) {
  if (data.length === 0) {
    return undefined;
  }

  const sortedData = _.sortBy(data);
  const index = Math.max(
    0,
    Math.ceil((Math.max(0, Math.min(percentile, 100)) / 100) * data.length) - 1
  );

  return sortedData[index];
}

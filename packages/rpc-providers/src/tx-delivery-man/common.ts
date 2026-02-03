import type { ChainConfigs } from "@redstone-finance/chain-configs";
import type { BigNumber } from "ethers";
import { z } from "zod";

export type AuctionModelFee = {
  gasPrice: number;
};

export type Eip1559Fee = {
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
};

export type FeeStructure = Eip1559Fee | AuctionModelFee;

export type GasOracleFn = (opts: TxDeliveryOptsValidated, attempt: number) => Promise<FeeStructure>;

export type DeliveryManTx = {
  nonce: number;
  chainId: number;
  from: string;
  to: string;
  data: string;
  gasLimit: number;
  value: string;
} & (
  | ({
      type: 2;
    } & Eip1559Fee)
  | ({
      type: 0;
    } & AuctionModelFee)
);

export const NewestBlockTypeEnum = z.enum(["latest", "pending"]);
export type NewestBlockType = z.infer<typeof NewestBlockTypeEnum>;

export enum RewardsPerBlockAggregationAlgorithm {
  Max = "max",
  Median = "median",
}

export type TxDeliveryOpts = {
  /**
   * It depends on network block finalization,
   * For example, for ETH ~12 s block times we should set it to 14_000
   */
  expectedDeliveryTimeMs: number;

  /**
   * Gas limit used by contract
   */
  gasLimit?: number;

  /**
   * If network support arbitrum like 2D fees should be set to true
   * more info: https://medium.com/offchainlabs/understanding-arbitrum-2-dimensional-fees-fd1d582596c9
   */
  twoDimensionalFees?: boolean;

  /**
   * Max number of attempts to deliver transaction
   */
  maxAttempts?: number;

  /**
   * Multiply last failed gas fee by
   */
  multiplier?: number;

  /**
   * Multiply las failed gas limit by
   */
  gasLimitMultiplier?: number;

  /**
   * Percentile(s) to use for priority/gas fee estimation across retry attempts.
   * Can be a single number (for backward compatibility) or an array of numbers.
   *
   * Behavior:
   * - Single number: Uses the same percentile for all retry attempts. The gas multiplier
   *   is still applied on each retry.
   * - Array: Each retry attempt uses the next percentile in the array. Once the last
   *   percentile is reached, it continues to be used for subsequent retries and the
   *   gas multiplier is used.
   *
   * Default: [25, 50, 75, 90, 99]
   *
   * Examples:
   * - 50 - use 50th percentile for all attempts (backward compatible)
   * - [25, 50, 75, 90, 99] - balanced approach with gradual escalation
   * - [50, 75, 95, 99] - start higher for faster initial confirmation
   * - [10, 25, 50, 75, 90, 99] - prioritize cost with more gradual escalation
   */
  percentileOfPriorityFee?: number | number[];

  /**
   * How many blocks to use in eth_feeHistory
   */
  numberOfBlocksForFeeHistory?: number;

  /**
   * Block to start fetching the fee history data from
   */
  newestBlockForFeeHistory?: NewestBlockType;

  /**
   * Should be set to true if chain doesn't support EIP1559
   */
  isAuctionModel?: boolean;

  /**
   * Forcefully disable custom gas oracle if defined
   */
  forceDisableCustomGasOracle?: boolean;

  logger?: (text: string) => void;

  gasOracleTimeout?: number;

  /**
   * Fast broadcast mode - used on fast chains (e.g. Monad).
   * In this mode, we skip waiting for mining inside TxDelivery.
   */
  fastBroadcastMode?: boolean;
  txNonceStaleThresholdMs?: number;
  /**
   * Minimum time in milliseconds spent on delivering a transaction to the blockchain.
   * If the transaction is delivered earlier, we wait until the specified time has fully elapsed.
   */
  minTxDeliveryTimeMs?: number;

  // Split waiting for tx, for 3 retries will check the transaction after ~expectedTxDeliveryTime/2 [ms], .../4, .../8, .../16
  splitWaitingForTxRetries?: number;

  // Timeout for fetching nonce from single rpc provider
  getSingleNonceTimeoutMs?: number;

  // minimal aggregatedRewardsPerBlock to be used for tx before falling back to eth_maxPriorityFeePerGas
  minAggregatedRewardsPerBlockForPercentile?: number;

  // Algorithm to aggregate rewards from last blocks
  rewardsPerBlockAggregationAlgorithm: RewardsPerBlockAggregationAlgorithm;

  // optional ChainConfigs object to use instead of local version
  chainConfigs?: ChainConfigs;
};

export type TxDeliveryOptsValidated = Omit<
  Required<TxDeliveryOpts>,
  | "gasLimit"
  | "getSingleNonceTimeoutMs"
  | "minAggregatedRewardsPerBlockForPercentile"
  | "chainConfigs"
> & {
  gasLimit?: number;
  getSingleNonceTimeoutMs?: number;
  minAggregatedRewardsPerBlockForPercentile?: number;
  chainConfigs?: ChainConfigs;
};

export const unsafeBnToNumber = (bn: BigNumber) => Number(bn.toString());

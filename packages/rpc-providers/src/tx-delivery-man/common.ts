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
   * If we want to take rewards from the last block we can achieve is using percentiles
   * 75 percentile we will receive reward which was given by 75% of users and 25% of them has given bigger reward
   * the bigger the value the higher priority fee
   * If you want to prioritize speed over cost choose number between 50-95
   * If you want to prioritize cost over speed choose numbers between 1-50
   */
  percentileOfPriorityFee?: number;

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
};

export type TxDeliveryOptsValidated = Omit<
  Required<TxDeliveryOpts>,
  "gasLimit" | "getSingleNonceTimeoutMs"
> & {
  gasLimit?: number;
};

export const unsafeBnToNumber = (bn: BigNumber) => Number(bn.toString());

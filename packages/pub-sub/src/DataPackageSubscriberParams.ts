import type { DataPackagesResponseStorage } from "@redstone-finance/sdk";

/**
 * defines behavior of {@link DataPackageSubscriber}
 */
export type DataPackageSubscriberParams = {
  /**
   * for production environment most of the time "redstone-primary-prod" is appropriate
   */
  dataServiceId: string;
  /**
   * array of tokens to fetch. If more than 50, then we subscribe to all. Because of message broker limits.
   */
  dataPackageIds: string[];
  /**
   * ensure minimum number of signers for each token - throws if there are less signers for any token
   */
  uniqueSignersCount: number;

  /**
   * has to be >= uniqueSignersCount
   * specify minimal number of signers per package which have to be aggregated before publishing
   */
  minimalOffChainSignersCount: number;

  /**
   * time which we will wait for additional packages after minimal requirements are satisfied
   */
  waitMsForOtherSignersAfterMinimalSignersCountSatisfied: number;

  /**
   * if set to true, it is enough that minimal requirements are satisfied for single package and all will be published
   */
  ignoreMissingFeeds: boolean;

  /**
   * List of signers from which packages will be accepted
   */
  authorizedSigners: string[];

  /**
   * If set, the values from unreferenced signers will be verified to not exceed the passed deviation in percent
   * WARNING: if too few reference values are found within the delay, the value is ACCEPTED
   * Default is 1 [%]
   */
  maxReferenceValueDeviationPercent?: number;

  /**
   * If maxReferenceValueDeviationPercent is set, specifies the delay (in seconds) of referenced values to be verified with
   * WARNING: if too few reference values are found within the delay, the value is ACCEPTED
   * Default is 3 [s]
   */
  maxReferenceValueDelayInSeconds?: number;

  /**
   * If maxReferenceValueDeviationPercent is set, specifies the minimum number of reference values required to perform deviation check
   * WARNING: if fewer reference values are found, the value is ACCEPTED
   * Default is 1
   */
  minReferenceValues?: number;

  /**
   * Configure statistics tracking for PubSub messages.
   *
   * Logs message statistics per topic and per client at regular intervals.
   *
   * @param 0 - Stats tracking disabled
   * @param undefined - Stats tracking enabled with default interval (60 seconds)
   * @param number > 0 - Stats tracking enabled with custom interval (in milliseconds)
   *
   * @default undefined (enabled with 60 second interval)
   *
   * @example
   * // Disabled
   * { statsLogIntervalMs: 0 }
   *
   * @example
   * // Enabled with default 60s interval
   * { statsLogIntervalMs: undefined } // or omit the parameter
   *
   * @example
   * // Enabled with custom 2-minute interval
   * { statsLogIntervalMs: 120_000 }
   */
  statsLogIntervalMs?: number;
  /**
   * Instance of the global storage to be used for caching responses
   */
  storageInstance?: DataPackagesResponseStorage;
};
